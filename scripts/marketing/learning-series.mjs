import assert from "node:assert/strict";

const escape = text => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const lines = text => escape(text).replaceAll("\n", "<br>");

export function learningSeriesStages(short, pacing, { handImage, focusImages }) {
  assert(short.focusCards?.length >= 1 && short.focusCards.length <= 2, "Use one or two lesson cards for the explanation");
  assert.equal(focusImages.length, short.focusCards.length);
  assert(short.startLesson && short.conversationPrompt, "Provide a concrete lesson and a discussion prompt");
  const focus = `<div class="series-focus${focusImages.length === 1 ? " single" : ""}">${focusImages.map((image, index) =>
    `<div><img src="${escape(image)}" alt="${escape(short.focusCards[index].card)}"><p>${lines(short.focusCards[index].label)}</p></div>`).join("")}</div>`;
  const cards = index => short.exposedHand ? focus : handImage(index);
  const stages = [
    ...(short.joke ? [{ id: "hook", duration: pacing.hook, html: `<h1>${lines(short.joke.heading)}</h1><p class="context">${lines(short.joke.context)}</p>${cards(0)}<p class="bottom small">${lines(short.joke.bottom)}</p>` }] : []),
    { id: "question", duration: pacing.question, html: `<h1>${lines(short.question)}</h1><p class="context">${lines(short.context)}</p>${cards(0)}<p class="bottom small">${lines(short.questionBottom)}</p>` },
    { id: "select-1", duration: pacing.selection, html: `<h1>${lines(short.selectionTitle)}<br><em>${lines(short.selectionAccent)}</em></h1><p class="context">${lines(short.selectionContext)}</p>${cards(1)}<p class="bottom small">${lines(short.selectionBottom)}</p>` },
    { id: "feedback", duration: pacing.feedback, html: `<h1>${lines(short.answerTitle)}<br><em>${lines(short.answerAccent)}</em></h1><p class="context">${lines(short.answerContext)}</p>${focus}<p class="bottom small">${lines(short.answerBottom)}</p>` },
    { id: "outro", duration: pacing.outro, html: `<h1>Try it yourself.</h1><p class="context">Free Gin Rummy lessons on Android.</p>${focus}<p class="series-route">Tap our channel → Google Play</p><p class="bottom small">Gin Rummy → Learn<br>${lines(short.startLesson)}</p>` }
  ];
  assert.equal(short.choices.length, 1, "A series episode teaches one decision");
  assert(stages.every(stage => Number.isFinite(stage.duration) && stage.duration > 0));
  assert(stages.slice(0, -1).every(stage => !/Google Play/.test(stage.html)), "Teach before the download invitation");
  return stages;
}

export const learningSeriesCSS = `
  .brand { font-size: 30px; }
  .brand img { width: 56px; height: 56px; }
  .brand span { font-size: 26px; }
  .bottom { top: 1300px; }
  .small { font-size: 38px; line-height: 1.3; }
  .series-focus { position: absolute; left: 78px; top: 630px; width: 840px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 48px; }
  .series-focus.single { grid-template-columns: 1fr; }
  .series-focus > div { display: grid; justify-items: center; gap: 22px; }
  .series-focus img { width: 230px; height: 334px; object-fit: contain; }
  .series-focus p { color: #efd281; font-size: 38px; line-height: 1.2; text-align: center; }
  .series-route { position: absolute; left: 78px; top: 1140px; width: 840px; font-size: 46px; font-weight: 700; color: #efd281; }
`;
