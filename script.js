import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAY-ofXgWEF0I8L-7mEwwionGtrtLf7fj0",
  authDomain: "bcup-da27b.firebaseapp.com",
  projectId: "bcup-da27b",
  storageBucket: "bcup-da27b.firebasestorage.app",
  messagingSenderId: "1067812351812",
  appId: "1:1067812351812:web:08454b08ca18b20bb57111"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const docRef = doc(db, "sync", "buttons");

const buttonContainer = document.getElementById("buttonContainer");
const rows = 3;
const columns = 40;
const totalButtons = rows * columns;

const buttons = [];

for (let i = 1; i <= totalButtons; i++) {
  const button = document.createElement("button");
  button.className = "square-button";
  button.textContent = ''; // Default empty
  button.dataset.id = i;

  // Stagger animation: 5ms delay per button (Faster)
  button.style.animationDelay = `${i * 0.005}s`;

  let clickCount = 0;
  let clickTimer = null;

  button.addEventListener("click", async () => {
    clickCount++;
    if (clickTimer) clearTimeout(clickTimer);

    if (clickCount === 3) {
      clearTimeout(clickTimer);
      clickCount = 0;
      openInputModal(i, button.textContent);
      return;
    }

    clickTimer = setTimeout(async () => {
      if (clickCount === 1) {
        const current = button.dataset.color || 'none';
        const order = ['none', 'orange', 'yellow', 'red', 'black'];
        const next = order[(order.indexOf(current) + 1) % order.length];
        button.dataset.color = next;
        button.style.backgroundColor = next === 'none' ? '#e0e0e0' : next;
        button.style.color = (next === 'black') ? '#ffffff' : '#000000';
        await setDoc(docRef, { colors: { [i]: next } }, { merge: true });
      }
      clickCount = 0;
    }, 500);
  });

  buttonContainer.appendChild(button);
  buttons.push(button);
}

onSnapshot(docRef, (snapshot) => {
  const data = snapshot.data() || {};
  const labels = data.labels || {};
  const colors = data.colors || {};
  buttons.forEach(button => {
    const id = button.dataset.id;
    if (labels[id] !== undefined) {
      button.textContent = labels[id];
    } else {
      button.textContent = ''; // Default empty
    }
    const color = colors[id] || 'none';
    button.dataset.color = color;
    button.style.backgroundColor = color === 'none' ? '#e0e0e0' : color;
    button.style.color = (color === 'black') ? '#ffffff' : '#000000';
  });
});

const resetBtn = document.getElementById('resetColors');
if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    resetBtn.disabled = true;

    let maxDelay = 0;

    buttons.forEach((button, index) => {
      const row = Math.floor(index / 40);
      const col = index % 40;

      const delay = (col + row) * 30;
      if (delay > maxDelay) maxDelay = delay;

      setTimeout(() => {
        button.classList.add('reset-animating');

        button.style.backgroundColor = '#e0e0e0';
        button.style.color = '#000000';
        button.dataset.color = 'none';

        setTimeout(() => {
          button.classList.remove('reset-animating');
        }, 400);
      }, delay);
    });

    setTimeout(async () => {
      const colorsPayload = {};
      for (let i = 1; i <= totalButtons; i++) {
        colorsPayload[i] = 'none';
      }
      try {
        await setDoc(docRef, { colors: colorsPayload }, { merge: true });
      } catch (e) {
        console.error("Reset failed:", e);
      } finally {
        resetBtn.disabled = false;
      }
    }, maxDelay + 200);
  });
}

const showBtn = document.getElementById('showResults');
const resultsModal = document.getElementById('resultsModal');
const resultsList = document.getElementById('resultsList');
const closeModal = document.getElementById('closeModal');

const inputModal = document.getElementById('inputModal');
const inputField = document.getElementById('inputField');
const cancelInputLink = document.getElementById('cancelInput');
const saveInputBtn = document.getElementById('saveInput');

let editingButtonId = null;

function openInputModal(id, currentText) {
  if (!inputModal) return;
  editingButtonId = id;
  inputField.value = currentText;
  inputModal.classList.remove('hidden');
  setTimeout(() => inputField.focus(), 50);
}

function closeInputModal() {
  if (!inputModal) return;
  inputModal.classList.add('hidden');
  editingButtonId = null;
  inputField.value = '';
  inputField.blur();
}

function openResultsModal(lines) {
  if (!resultsModal || !resultsList) return;
  resultsList.innerHTML = '';
  lines.forEach(line => {
    const div = document.createElement('div');
    div.textContent = line;
    resultsList.appendChild(div);
  });
  resultsModal.classList.remove('hidden');
}

function closeResultsModal() {
  if (!resultsModal) return;
  resultsModal.classList.add('hidden');
}

if (closeModal) closeModal.addEventListener('click', closeResultsModal);
if (resultsModal) resultsModal.addEventListener('click', (e) => {
  if (e.target === resultsModal) closeResultsModal();
});

if (inputModal) {
  inputModal.addEventListener('click', (e) => {
    if (e.target === inputModal) closeInputModal();
  });

  if (cancelInputLink) {
    cancelInputLink.addEventListener('click', closeInputModal);
  }

  const saveAction = async () => {
    if (editingButtonId !== null) {
      const newText = inputField.value;
      await setDoc(docRef, { labels: { [editingButtonId]: newText } }, { merge: true });
      closeInputModal();
    }
  };

  if (saveInputBtn) {
    saveInputBtn.addEventListener('click', saveAction);
  }

  inputField.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveAction();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeInputModal();
    }
  });
}

if (showBtn) {
  showBtn.addEventListener('click', () => {
    const colorMap = {};
    buttons.forEach(b => {
      const c = (b.dataset.color || '').toString().toLowerCase();
      if (!c || c === 'none') return;
      const txt = b.textContent.trim();
      if (!colorMap[c]) colorMap[c] = [];
      colorMap[c].push(txt);
    });

    if (Object.keys(colorMap).length === 0) {
      openResultsModal(['今週は優秀やったね']);
      return;
    }

    const sortList = (arr) => arr.slice().sort((a, b) => {
      const na = Number(a);
      const nb = Number(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    });

    const mapLabel = (col) => {
      const m = { black: '黒', red: '赤', orange: '橙', yellow: '黄' };
      return m[col] || col;
    };

    const preferred = ['black', 'red', 'orange', 'yellow'];
    const lines = [];
    preferred.forEach(col => {
      if (colorMap[col]) {
        lines.push(`[${mapLabel(col)}]${sortList(colorMap[col]).join(',')}`);
        delete colorMap[col];
      }
    });
    Object.keys(colorMap).sort().forEach(col => {
      lines.push(`[${mapLabel(col)}]${sortList(colorMap[col]).join(',')}`);
    });

    openResultsModal(lines);
  });
}
