use barbu_core::cards::{Card, Rank, Suit};
use barbu_core::hand::CompletedTrick;
use barbu_core::trick::PlayedCard;
use barbu_core::whist::{choose_whist_card, WhistPosition};
use serde_json::Value;

fn card(id: &str) -> Card {
    let (rank, suit) = id.split_at(id.len() - 1);
    Card::new(
        Rank::ALL
            .into_iter()
            .find(|r| r.short_name() == rank)
            .unwrap(),
        Suit::ALL
            .into_iter()
            .find(|s| s.short_name() == suit)
            .unwrap(),
    )
}

fn plays(value: &Value) -> Vec<PlayedCard> {
    value
        .as_array()
        .unwrap()
        .iter()
        .map(|play| {
            PlayedCard::new(
                play[0].as_u64().unwrap() as usize,
                card(play[1].as_str().unwrap()),
            )
        })
        .collect()
}

#[test]
fn shared_whist_policy_positions() {
    let cases: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/whist-policy.json")).unwrap();
    for case in cases.as_array().unwrap() {
        let hand: Vec<Card> = case["hand"]
            .as_array()
            .unwrap()
            .iter()
            .map(|id| card(id.as_str().unwrap()))
            .collect();
        let trick = plays(&case["trick"]);
        let history: Vec<CompletedTrick> = case["history"]
            .as_array()
            .unwrap()
            .iter()
            .map(|trick| CompletedTrick {
                cards: plays(trick),
                winner: 0,
                penalty: 0,
            })
            .collect();
        let turned_trump = case["turnedTrump"].as_array().map(|turned| {
            (
                turned[0].as_u64().unwrap() as usize,
                card(turned[1].as_str().unwrap()),
            )
        });
        let position = WhistPosition {
            hand: &hand,
            trick: &trick,
            history: &history,
            player: case["player"].as_u64().unwrap() as usize,
            trump: card(&format!("2{}", case["trump"].as_str().unwrap())).suit,
            turned_trump,
        };
        assert_eq!(
            choose_whist_card(&position).map(|card| card.to_string()),
            Some(case["expected"].as_str().unwrap().to_string()),
            "{}",
            case["name"]
        );
    }
}

#[test]
fn whist_deals_complete_legally_and_keep_public_metadata() {
    use barbu_core::hand::{
        play_whist_card, start_whist_hand_with_dealer, whist_deal_info, HandStatus,
    };
    for seed in 0..128 {
        let dealer = (seed as usize / 4) % 4;
        let mut state = start_whist_hand_with_dealer(seed, dealer);
        let mut remaining = state.hands.clone();
        for play in &state.current_trick {
            remaining[play.player].push(play.card);
        }
        let metadata = whist_deal_info(&state).unwrap();
        assert_eq!(metadata.0, dealer);
        assert!(
            state.hands[dealer].contains(&metadata.1)
                || state
                    .current_trick
                    .iter()
                    .any(|p| p.player == dealer && p.card == metadata.1)
        );
        let mut decisions = 0;
        while state.status != HandStatus::Complete {
            let selected = state.legal_player_cards()[0];
            state = play_whist_card(state, selected).unwrap();
            decisions += 1;
            assert!(decisions <= 13);
        }
        assert_eq!(decisions, 13);
        assert_eq!(state.completed_tricks.len(), 13);
        assert_eq!(whist_deal_info(&state), Some(metadata));
        let mut seen = std::collections::HashSet::new();
        for trick in &state.completed_tricks {
            assert_eq!(trick.cards.len(), 4);
            for play in &trick.cards {
                assert!(seen.insert(play.card));
                assert!(barbu_core::trick::legal_cards(
                    &remaining[play.player],
                    Some(trick.cards[0].card.suit)
                )
                .contains(&play.card));
                remaining[play.player].retain(|card| *card != play.card);
            }
        }
        assert_eq!(seen.len(), 52);
        assert!(state.hands.iter().all(Vec::is_empty));
    }
}

#[test]
fn shared_whist_session_settlements() {
    use barbu_core::whist::settle_whist_hand;
    let cases: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/whist-session.json")).unwrap();
    let pair = |v: &Value| [v[0].as_u64().unwrap() as u32, v[1].as_u64().unwrap() as u32];
    for case in cases.as_array().unwrap() {
        let actual = settle_whist_hand(
            pair(&case["scores"]),
            pair(&case["games"]),
            pair(&case["odd"]),
            case["mode"] == "rubber",
        );
        assert_eq!(actual.points, pair(&case["points"]), "{}", case["name"]);
        assert_eq!(actual.games, pair(&case["gamesWon"]), "{}", case["name"]);
        assert_eq!(
            actual.game_complete,
            case["gameComplete"].as_bool().unwrap()
        );
        assert_eq!(actual.complete, case["complete"].as_bool().unwrap());
        assert_eq!(actual.next_scores, pair(&case["nextScores"]));
    }
}
