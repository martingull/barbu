#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GameLesson {
    pub id: &'static str,
    pub title: &'static str,
    pub family: &'static str,
    pub players: u8,
    pub overview: &'static str,
    pub contracts: Vec<ContractLesson>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ContractLesson {
    pub id: &'static str,
    pub title: &'static str,
    pub objective: &'static str,
    pub steps: Vec<LessonStep>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LessonStep {
    pub title: &'static str,
    pub body: &'static str,
}

pub fn barbu_learning_path() -> GameLesson {
    GameLesson {
        id: "barbu",
        title: "Barbu",
        family: "Hearts",
        players: 4,
        overview: "A contract trick-taking game where players learn avoidance play through several focused penalties.",
        contracts: vec![
            ContractLesson {
                id: "no_hearts",
                title: "No Hearts",
                objective: "Avoid winning tricks that contain hearts.",
                steps: vec![
                    LessonStep {
                        title: "Follow the led suit",
                        body: "If you have a card in the suit led to the trick, you must play one of those cards.",
                    },
                    LessonStep {
                        title: "Hearts are penalties",
                        body: "Each heart in a trick is a point against the player who wins that trick.",
                    },
                    LessonStep {
                        title: "Void suits create choices",
                        body: "When you cannot follow suit, you may discard a dangerous card or save it for a later trick.",
                    },
                ],
            },
            ContractLesson {
                id: "no_queens",
                title: "No Queens",
                objective: "Avoid winning tricks that contain queens.",
                steps: vec![LessonStep {
                    title: "Spot loaded tricks",
                    body: "Queens become dangerous only when they are captured in a trick you win.",
                }],
            },
            ContractLesson {
                id: "barbu",
                title: "Barbu",
                objective: "Avoid taking the king of hearts.",
                steps: vec![LessonStep {
                    title: "Track the king",
                    body: "The key card is singular, so suit tracking and lead control matter more than raw point count.",
                }],
            },
        ],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn barbu_path_starts_with_no_hearts() {
        let lesson = barbu_learning_path();

        assert_eq!(lesson.family, "Hearts");
        assert_eq!(lesson.players, 4);
        assert_eq!(lesson.contracts[0].id, "no_hearts");
    }
}
