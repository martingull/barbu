use barbu_core::cards::{Card, Rank, Suit};
use barbu_core::hand::{
    apply_hearts_pass_direction, play_hearts_card, start_hearts_hand, start_hearts_passing_hand,
    CompletedTrick, HandStatus,
};
use barbu_core::hearts::{choose_hearts_card, choose_hearts_pass, HeartsPosition};
use barbu_core::trick::{trick_winner, PlayedCard};
use serde_json::Value;

fn card(id: &str) -> Card {
    let (r, s) = id.split_at(id.len() - 1);
    Card::new(
        Rank::ALL
            .into_iter()
            .find(|rank| rank.short_name() == r)
            .unwrap(),
        Suit::ALL
            .into_iter()
            .find(|suit| suit.short_name() == s)
            .unwrap(),
    )
}

fn cards(value: &Value) -> Vec<Card> {
    value
        .as_array()
        .unwrap()
        .iter()
        .map(|id| card(id.as_str().unwrap()))
        .collect()
}

fn plays(value: &Value, rotation: usize) -> Vec<PlayedCard> {
    value
        .as_array()
        .unwrap()
        .iter()
        .map(|p| {
            PlayedCard::new(
                (p[0].as_u64().unwrap() as usize + rotation) % 4,
                card(p[1].as_str().unwrap()),
            )
        })
        .collect()
}

fn points(cards: &[PlayedCard]) -> i32 {
    cards
        .iter()
        .map(|p| {
            if p.card == card("QS") {
                13
            } else if p.card.suit == Suit::Hearts {
                1
            } else {
                0
            }
        })
        .sum()
}

#[test]
fn shared_hearts_positions_are_seat_neutral() {
    let cases: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/hearts-policy.json")).unwrap();
    for case in cases.as_array().unwrap() {
        for rotation in 0..4 {
            let hand = cards(&case["hand"]);
            let trick = plays(&case["trick"], rotation);
            let history: Vec<_> = case["history"]
                .as_array()
                .unwrap()
                .iter()
                .map(|t| {
                    let cards = plays(t, rotation);
                    CompletedTrick {
                        winner: trick_winner(&cards).unwrap(),
                        penalty: points(&cards),
                        cards,
                    }
                })
                .collect();
            let following: Vec<_> = hand
                .iter()
                .copied()
                .filter(|c| trick.first().is_some_and(|p| p.card.suit == c.suit))
                .collect();
            let legal = if case["legal"].is_array() {
                cards(&case["legal"])
            } else if following.is_empty() {
                hand.clone()
            } else {
                following
            };
            let p = HeartsPosition {
                hand: &hand,
                legal: &legal,
                player: (case["player"].as_u64().unwrap() as usize + rotation) % 4,
                trick: &trick,
                history: &history,
            };
            assert_eq!(
                choose_hearts_card(&p).map(|c| c.to_string()),
                case["expected"].as_str().map(str::to_string),
                "{} rotation {rotation}",
                case["name"]
            );
        }
    }
}

#[test]
fn shared_hearts_pass_choices_preserve_low_exits() {
    let cases: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/hearts-pass.json")).unwrap();
    for case in cases.as_array().unwrap() {
        let mut hand = cards(&case["hand"]);
        let expected = cards(&case["expected"]);
        assert_eq!(choose_hearts_pass(&hand), expected, "{}", case["name"]);
        hand.reverse();
        assert_eq!(
            choose_hearts_pass(&hand),
            expected,
            "input order must not change the pass"
        );
    }
}

#[test]
fn hearts_full_deals_and_all_pass_directions_stay_legal() {
    for seed in 0..128 {
        for direction in 0..4 {
            let mut state = if direction == 0 {
                start_hearts_hand(seed)
            } else {
                let initial = start_hearts_passing_hand(seed);
                let selected = choose_hearts_pass(&initial.hands[2]);
                let dealt =
                    apply_hearts_pass_direction(initial, selected.clone(), direction).unwrap();
                for c in selected {
                    let recipient = (2 + direction) % 4;
                    assert!(
                        dealt.hands[recipient].contains(&c)
                            || dealt
                                .current_trick
                                .iter()
                                .any(|p| p.player == recipient && p.card == c)
                    );
                }
                dealt
            };
            let mut audit = state.clone();
            for play in audit.current_trick.clone() {
                audit.hands[play.player].push(play.card);
            }
            audit.current_trick.clear();
            assert!(audit.hands.iter().all(|hand| hand.len() == 13));
            let mut choices = 0;
            while state.status != HandStatus::Complete {
                let legal = state.legal_player_cards();
                let chosen = choose_hearts_card(&HeartsPosition {
                    hand: &state.hands[2],
                    legal: &legal,
                    player: 2,
                    trick: &state.current_trick,
                    history: &state.completed_tricks,
                })
                .unwrap();
                state = play_hearts_card(state, chosen).unwrap();
                choices += 1;
                assert!(choices <= 13);
            }
            assert_eq!(choices, 13);
            assert_eq!(state.completed_tricks.len(), 13);
            assert_eq!(
                state
                    .completed_tricks
                    .iter()
                    .map(|t| t.penalty)
                    .sum::<i32>(),
                26
            );
            let mut seen = std::collections::HashSet::new();
            let mut leader = audit
                .hands
                .iter()
                .position(|hand| hand.contains(&card("2C")))
                .unwrap();
            for trick in &state.completed_tricks {
                assert_eq!(trick.cards.len(), 4);
                for (index, play) in trick.cards.iter().enumerate() {
                    assert_eq!(play.player, (leader + index) % 4);
                    audit.current_player = play.player;
                    assert!(seen.insert(play.card));
                    assert!(
                        audit
                            .legal_cards_for_player(play.player)
                            .contains(&play.card),
                        "seed {seed}, direction {direction}: {}",
                        play.card
                    );
                    audit.hands[play.player].retain(|card| *card != play.card);
                    audit.current_trick.push(*play);
                }
                assert_eq!(trick_winner(&trick.cards), Some(trick.winner));
                assert_eq!(points(&trick.cards), trick.penalty);
                leader = trick.winner;
                audit.completed_tricks.push(trick.clone());
                audit.current_trick.clear();
            }
            assert_eq!(seen.len(), 52);
            assert!(state.hands.iter().all(Vec::is_empty));
        }
    }
}
