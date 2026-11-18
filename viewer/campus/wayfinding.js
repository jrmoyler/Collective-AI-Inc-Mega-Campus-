// Search the same floor schedule used to construct the interior and its schematic plan.
export function levelCode(facility, index) {
  return facility.id === 3 ? `B${index + 1}` : `L${String(index + 1).padStart(2, '0')}`;
}

export function findDestinations(facilities, districts, query, districtId) {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = [];
  for (const facility of facilities) {
    if (districtId && districtId !== facility.district) continue;
    const identity = `${facility.key} ${facility.name} ${districts[facility.district]}`.toLowerCase();
    const floorTerms = tokens.filter(token => !identity.includes(token));
    if (!floorTerms.length) {
      matches.push({ facility, floor: 0, program: '' });
      continue;
    }
    facility.program.forEach((schedule, floor) => {
      const text = `${levelCode(facility, floor)} ${schedule}`.toLowerCase();
      if (floorTerms.every(token => text.includes(token))) {
        const rooms = schedule.split(';');
        const room = rooms.find(name => floorTerms.some(token => name.toLowerCase().includes(token)));
        matches.push({ facility, floor, program: room || rooms[0] });
      }
    });
  }
  return matches;
}

export function renderDirectory({ list, count, reset, facilities, districts, query, district, select }) {
  const matches = findDestinations(facilities, districts, query, district);
  const fragment = document.createDocumentFragment();
  for (const {facility, floor, program} of matches) {
    const button = document.createElement('button');
    const identifier = document.createElement('span');
    identifier.className = 'facility-number';
    identifier.textContent = facility.key;
    const label = document.createElement('div');
    const name = document.createElement('strong');
    const meta = document.createElement('small');
    name.textContent = program || facility.name;
    meta.textContent = program
      ? `${facility.name} · ${levelCode(facility, floor)}`
      : `${districts[facility.district]} · ${facility.levels} ${facility.levels === 1 ? 'floor' : 'floors'}`;
    label.append(name, meta);
    button.append(identifier, label);
    button.onclick = () => select(facility.id, floor);
    fragment.append(button);
  }
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Try a different room, facility name, or district.';
    fragment.append(empty);
  }
  list.replaceChildren(fragment);
  reset.hidden = !query && !district;
  count.textContent = `${matches.length} ${matches.length === 1 ? 'destination' : 'destinations'}`;
}
