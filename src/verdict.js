// Verdict selon la gravité la plus haute relevée sur le PV.
export function verdict(defauts) {
  const compte = { critique: 0, majeure: 0, mineure: 0 };
  for (const d of defauts) compte[d.gravite] += 1;

  if (compte.critique > 0) return { niveau: 'critique', titre: 'CRITIQUE — contre-visite sous 24 h', compte };
  if (compte.majeure > 0) return { niveau: 'defavorable', titre: 'DÉFAVORABLE — contre-visite', compte };
  return { niveau: 'favorable', titre: 'FAVORABLE', compte };
}
