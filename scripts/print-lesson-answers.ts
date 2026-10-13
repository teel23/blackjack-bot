// Dev tool: print the computed answer for every lesson decision question.
import { LESSONS } from '../content/lessons';
import { gradeLessonQuestion } from '../lib/learn';
for (const l of LESSONS) {
  l.questions.forEach((q, i) => {
    if (q.type !== 'decision') return;
    const g = gradeLessonQuestion(q);
    console.log(`${l.id} q${i + 1}: ${q.player.join(',')} v ${q.up}${q.rules ? ' ' + JSON.stringify(q.rules) : ''} -> ${g.rec.action} (${g.rec.code})`);
  });
}
console.log('lessons:', LESSONS.length);
