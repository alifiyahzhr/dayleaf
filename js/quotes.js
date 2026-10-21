/* dayleaf — quote of the day. Quran verses are given in meaning (not as a word-for-word translation);
   sayings of the Companions and scholars are the commonly reported ones, marked "attributed" where the chain is debated. */
(function (g) {
  const NB = 'Prophet Muhammad ︎ﷺ';
  const quran = [
    ['Indeed, with hardship comes ease.', 'Quran 94:5–6'],
    ['Allah does not burden a soul beyond what it can bear.', 'Quran 2:286'],
    ['So remember Me, and I will remember you.', 'Quran 2:152'],
    ['Whoever puts their trust in Allah, He is enough for them.', 'Quran 65:3'],
    ['Truly, in the remembrance of Allah do hearts find rest.', 'Quran 13:28'],
    ['Do not lose hope in the mercy of Allah.', 'Quran 39:53'],
    ['My Lord, increase me in knowledge.', 'Quran 20:114'],
    ['Allah does not change a people’s condition until they change what is within themselves.', 'Quran 13:11'],
    ['So be patient — the promise of Allah is true.', 'Quran 30:60'],
    ['Indeed, Allah is with the patient.', 'Quran 2:153'],
    ['And speak to people good words.', 'Quran 2:83'],
    ['And He is with you wherever you are.', 'Quran 57:4'],
  ].map(([t, a]) => ({ t, a, k: 'Quran' }));

  const hadith = [
    ['The most beloved deeds to Allah are those done consistently, even if they are small.', NB + ' · Bukhari & Muslim'],
    ['Actions are judged by intentions, and everyone will have what they intended.', NB + ' · Bukhari & Muslim'],
    ['Make things easy and do not make them hard. Give good news and do not drive people away.', NB + ' · Bukhari & Muslim'],
    ['The strong person is not the one who overcomes others, but the one who controls themselves in anger.', NB + ' · Bukhari & Muslim'],
    ['Your smile for your brother or sister is charity.', NB + ' · Tirmidhi'],
    ['The best of you are those who have the best character.', NB + ' · Bukhari & Muslim'],
    ['Take advantage of five before five: your youth before old age, your health before illness, your wealth before poverty, your free time before you are busy, and your life before your death.', NB + ' · al-Hakim'],
    ['Be in this world as though you were a stranger or a traveller.', NB + ' · Bukhari'],
    ['Whoever travels a path seeking knowledge, Allah makes easy for them a path to Paradise.', NB + ' · Muslim'],
    ['Tie your camel, then put your trust in Allah.', NB + ' · Tirmidhi'],
    ['How wonderful is the believer’s situation: in ease they are grateful, in hardship they are patient, and both are good for them.', NB + ' · Muslim (meaning)'],
    ['Whoever believes in Allah and the Last Day, let them speak good or stay silent.', NB + ' · Bukhari & Muslim'],
  ].map(([t, a]) => ({ t, a, k: 'Hadith' }));

  const companions = [
    ['Take account of yourselves before you are taken to account, and weigh your deeds before they are weighed for you.', 'Umar ibn al-Khattab (r.a.) · attributed'],
    ['Patience is to faith what the head is to the body.', 'Ali ibn Abi Talib (r.a.) · attributed'],
    ['The worth of every person lies in what they do well.', 'Ali ibn Abi Talib (r.a.) · attributed'],
    ['If I do well, support me; if I do wrong, correct me.', 'Abu Bakr as-Siddiq (r.a.)'],
  ].map(([t, a]) => ({ t, a, k: 'Companion' }));

  const scholars = [
    ['Whoever does not taste the bitterness of learning for an hour will taste the humiliation of ignorance for a lifetime.', 'Imam al-Shafi’i · attributed'],
    ['Knowledge is not in much narration; it is a light that Allah places in the heart.', 'Imam Malik · attributed'],
    ['O son of Adam, you are only a number of days; when a day goes by, a part of you goes with it.', 'Hasan al-Basri'],
    ['With the inkwell, until the grave.', 'Imam Ahmad ibn Hanbal · on seeking knowledge'],
    ['I did not place a single hadith in my Sahih until I had washed and prayed two units of prayer.', 'Imam al-Bukhari · attributed'],
    ['Faith has two halves: half is patience and half is gratitude.', 'Ibn al-Qayyim'],
  ].map(([t, a]) => ({ t, a, k: 'Scholar' }));

  const women = [
    ['One’s life has value so long as one attributes value to the life of others, by means of love, friendship, indignation and compassion.', 'Simone de Beauvoir'],
    ['Forgiveness is the only reaction that does not merely re-act but acts anew and unexpectedly.', 'Hannah Arendt'],
    ['Attention is the rarest and purest form of generosity.', 'Simone Weil'],
    ['Love is the extremely difficult realisation that something other than oneself is real.', 'Iris Murdoch'],
    ['I do not wish them to have power over men; but over themselves.', 'Mary Wollstonecraft'],
    ['Love God for God’s own sake, not out of fear of punishment or hope of reward.', 'Rabia al-Adawiyya · attributed (meaning)'],
    ['To be a good human being is to have a kind of openness to the world, an ability to trust uncertain things beyond your own control.', 'Martha Nussbaum'],
  ].map(([t, a]) => ({ t, a, k: 'Philosophy' }));

  // interleave the groups so the quote of the day keeps changing flavour
  const groups = [quran, hadith, women, scholars, companions], out = [];
  for (let i = 0; groups.some(gr => i < gr.length); i++) groups.forEach(gr => { if (i < gr.length) out.push(gr[i]); });
  g.QUOTES = out;
})(window);
