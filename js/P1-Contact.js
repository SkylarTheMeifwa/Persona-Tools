// P1-Contact.js
// Handles Persona 1 Demon Contact Guide logic

const CHARACTERS = ["MC", "Maki", "Mark", "Nanjo", "Yukino", "Elly", "Reiji", "Ayase"];

function loadCheckedCharacters() {
    const stored = localStorage.getItem('checkedCharacters');
    if (!stored) return CHARACTERS;
    try {
        const arr = JSON.parse(stored);
        if (Array.isArray(arr)) return arr;
    } catch {}
    return CHARACTERS;
}

function saveCheckedCharacters(chars) {
    localStorage.setItem('checkedCharacters', JSON.stringify(chars));
}

function setupCharacterCheckboxes() {
    const checked = loadCheckedCharacters();
    document.querySelectorAll('.char-checkbox').forEach(cb => {
        cb.checked = checked.includes(cb.value);
        cb.addEventListener('change', () => {
            const newChecked = Array.from(document.querySelectorAll('.char-checkbox:checked')).map(cb => cb.value);
            saveCheckedCharacters(newChecked);
            renderDemons();
        });
    });
}

function getCheckedCharacters() {
    return Array.from(document.querySelectorAll('.char-checkbox:checked')).map(cb => cb.value);
}

function parseEager(eagerArr) {
    const eagerMap = {};
    eagerArr.forEach(e => {
        const match = e.match(/^(.*?)(?: \((.*?)\))?$/);
        if (!match) return;
        const action = match[1].trim();
        if (!match[2]) {
            if (!eagerMap['']) eagerMap[''] = [];
            eagerMap[''].push(action);
        } else {
            match[2].split(',').map(s => s.trim()).forEach(char => {
                if (!eagerMap[char]) eagerMap[char] = [];
                eagerMap[char].push(action);
            });
        }
    });
    return eagerMap;
}

function renderDemons() {
    const search = document.getElementById('searchbar').value.trim().toLowerCase();
    const checkedChars = getCheckedCharacters();
    const demonList = document.getElementById('demonList');
    demonList.innerHTML = '';

    if (!window.demons) {
        demonList.innerHTML = '<em>Loading demon data...</em>';
        return;
    }

    const demonsFiltered = window.demons.filter(demon => {
        if (search && !demon.name.toLowerCase().includes(search)) return false;
        if (!demon.eager) return false;
        const eagerMap = parseEager(demon.eager);
        const hasUnassigned = eagerMap[''] && eagerMap[''].length > 0;
        const hasChecked = checkedChars.some(char => eagerMap[char] && eagerMap[char].length > 0);
        return hasUnassigned || hasChecked;
    });

    if (demonsFiltered.length === 0) {
        demonList.innerHTML = '<em>No demons found.</em>';
        return;
    }

    demonsFiltered.forEach(demon => {
        const eagerMap = parseEager(demon.eager);
        let eagerParts = [];
        if (eagerMap[''] && eagerMap[''].length > 0) {
            eagerParts.push(`<strong>Eager</strong>: ${eagerMap[''].join(', ')}`);
        }
        checkedChars.forEach(char => {
            if (eagerMap[char] && eagerMap[char].length > 0) {
                eagerParts.push(`<strong>${char}</strong>: ${eagerMap[char].join(', ')}`);
            }
        });
        const entry = document.createElement('div');
        entry.className = 'demon-entry';
        entry.innerHTML = `<span><strong>${demon.name}</strong></span><span class="eager-values">${eagerParts.join(' | ')}</span>`;
        demonList.appendChild(entry);
    });
}

document.getElementById('searchBtn').addEventListener('click', renderDemons);

window.addEventListener('DOMContentLoaded', () => {
    setupCharacterCheckboxes();
    renderDemons();
});
