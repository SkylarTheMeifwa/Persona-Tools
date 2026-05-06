// Skill to character mapping (English only, no Japanese)
const SKILL_TO_CHAR = {
    'Persuade': ['MC', 'Yukino'],
    'Taunt': ['MC', 'Mark'],
    'Invite': ['MC', 'Elly'],
    'Sing': ['MC', 'Elly'],
    'Plead': ['Maki'],
    'Flatter': ['Maki'],
    'Lie': ['Maki'],
    'Cringe': ['Maki'],
    'Bribe': ['Nanjo'],
    'Pontificate': ['Nanjo'],
    'Condescend': ['Nanjo'],
    'Sarcasm': ['Nanjo'],
    'Dance': ['Mark'],
    'Stare': ['Mark'],
    'Brag': ['Mark'],
    'Pick up': ['Brown'],
    'Joke': ['Brown'],
    'Chat': ['Brown'],
    'Startle': ['Brown'],
    'Horrify': ['Elly'],
    'Soothe': ['Elly'],
    'Abuse': ['Ayase'],
    'Seduce': ['Ayase'],
    'Cry': ['Ayase'],
    'Threaten': ['Ayase', 'Reiji'],
    'Bully': ['Yukino'],
    'Scold': ['Yukino'],
    'Ignore': ['Yukino', 'Reiji'],
    'Prestidigitate': ['Reiji'],
    'Scream': ['Reiji']
};
// P1-Contact.js
// Handles Persona 1 Demon Contact Guide logic

const CHARACTERS = ["Maki", "Mark", "Nanjo", "Yukino", "Elly", "Reiji", "Ayase"];


function loadCheckedCharacters() {
    const stored = localStorage.getItem('checkedCharacters');
    let arr = CHARACTERS;
    if (stored) {
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) arr = parsed;
        } catch {}
    }
    // Always include MC
    if (!arr.includes("MC")) arr = ["MC", ...arr];
    return arr;
}


function saveCheckedCharacters(chars) {
    // Always save without MC, since MC is always included
    const filtered = chars.filter(c => c !== "MC");
    localStorage.setItem('checkedCharacters', JSON.stringify(filtered));
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
    // Always include MC
    const checked = Array.from(document.querySelectorAll('.char-checkbox:checked')).map(cb => cb.value);
    if (!checked.includes("MC")) checked.unshift("MC");
    return checked;
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
        let eagerSkills = [];
        // Collect skills with explicit character assignment
        checkedChars.forEach(char => {
            if (eagerMap[char] && eagerMap[char].length > 0) {
                eagerMap[char].forEach(skill => {
                    eagerSkills.push({ skill, chars: [char] });
                });
            }
        });
        // Collect unassigned skills and map to checked characters
        if (eagerMap[''] && eagerMap[''].length > 0) {
            eagerMap[''].forEach(skill => {
                // Find which checked characters can use this skill
                const chars = (SKILL_TO_CHAR[skill] || []).filter(c => checkedChars.includes(c));
                if (chars.length > 0) {
                    eagerSkills.push({ skill, chars });
                }
            });
        }
        // Remove duplicates (skill+chars)
        const seen = new Set();
        eagerSkills = eagerSkills.filter(({ skill, chars }) => {
            const key = skill + '|' + chars.sort().join(',');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        // Format output as a bulleted list, demon name left, list centered
        const eagerDisplay = eagerSkills.map(({ skill, chars }) => {
            if (chars.length === 0) return `<li>${skill}</li>`;
            return `<li>${skill} (${chars.join(', ')})</li>`;
        });
        const entry = document.createElement('div');
        entry.className = 'demon-entry';
        entry.innerHTML = `
            <div style="text-align:left;"><strong>${demon.name}</strong>:</div>
            <div style="display:flex; justify-content:center;">
                <ul style="margin-left:1.5em; margin-top:0.2em; text-align:center;">
                    ${eagerDisplay.join('')}
                </ul>
            </div>
        `;
        demonList.appendChild(entry);
    });
}

document.getElementById('searchBtn').addEventListener('click', renderDemons);

window.addEventListener('DOMContentLoaded', () => {
    setupCharacterCheckboxes();
    renderDemons();
});
