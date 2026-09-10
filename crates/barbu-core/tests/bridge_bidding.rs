use barbu_core::bridge::{bridge_legal_calls, bridge_suggest_call, BridgeAuctionCall, BridgeCall};
use barbu_core::cards::{Card, Rank, Suit};
use serde_json::Value;

#[test]
fn bridge_bidding_matches_shared_fixtures_at_every_seat() {
    let data: Value =
        serde_json::from_str(include_str!("../../../tests/fixtures/bridge-bidding.json")).unwrap();
    for case in data["cases"].as_array().unwrap() {
        let mut hand: Vec<_> = data["hands"][case["hand"].as_str().unwrap()]
            .as_str()
            .unwrap()
            .split_whitespace()
            .map(|id| {
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
            })
            .collect();
        assert_eq!(hand.len(), 13);
        for rotation in 0..4 {
            let dealer = (case["dealer"].as_u64().unwrap() as usize + rotation) % 4;
            let calls: Vec<_> = case["calls"]
                .as_array()
                .unwrap()
                .iter()
                .enumerate()
                .map(|(index, call)| BridgeAuctionCall {
                    seat: (dealer + index) % 4,
                    call: BridgeCall::from_label(call.as_str().unwrap()).unwrap(),
                })
                .collect();
            let seat = (dealer + calls.len()) % 4;
            for _ in 0..2 {
                let actual = bridge_suggest_call(&hand, seat, &calls, dealer);
                assert_eq!(
                    actual.id(),
                    case["expected"].as_str().unwrap(),
                    "{} rotation {}",
                    case["name"],
                    rotation
                );
                let legal = bridge_legal_calls(&calls, seat, dealer);
                assert!(legal.is_empty() || legal.contains(&actual));
                hand.reverse();
            }
        }
    }
}
