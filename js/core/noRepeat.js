// Remembers the last `windowSize` picks so the same template/name doesn't show up twice in a row.
export function createNoRepeat(windowSize) {
  const recent = [];

  function remember(key) {
    recent.push(key);
    while (recent.length > windowSize) recent.shift();
  }

  function pickFresh(rng, items, keyOf = (t) => String(t)) {
    const fresh = items.filter((t) => !recent.includes(keyOf(t)));
    const choice = rng.pick(fresh.length ? fresh : items);
    remember(keyOf(choice));
    return choice;
  }

  return { pickFresh, remember };
}
