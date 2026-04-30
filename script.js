// --- Default Initial Data (From Section C schedule) ---
const defaultTasks = [
    { id: 1, name: "Discrete Mathematics - Class Test", date: "2026-05-04", subject: "subj-math", completed: false },
    { id: 2, name: "Glimpses of Glorious India - MaOm", date: "2026-05-06", subject: "subj-india", completed: false },
    { id: 3, name: "GGI - Rough Book Submission", date: "2026-05-07", subject: "subj-india", completed: false },
    { id: 4, name: "Linear Algebra - Class Test", date: "2026-05-11", subject: "subj-linear", completed: false }
];

let tasks = JSON.parse(localStorage.getItem('studyHubTasks')) || defaultTasks;

// --- Render Task List ---
function renderTasks() {
    const listContainer = document.getElementById('assignment-list');
    listContainer.innerHTML = ''; 

    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return new Date(a.date) - new Date(b.date);
    });

    tasks.forEach(task => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `assignment-item ${task.completed ? 'completed' : ''}`;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const targetDate = new Date(task.date);
        targetDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        
        let badgeHTML = '';
        if (!task.completed) {
            if (diffDays > 0) badgeHTML = `<span class="days-badge ${diffDays <= 5 ? 'urgent' : ''}">${diffDays} Days Left</span>`;
            else if (diffDays === 0) badgeHTML = `<span class="days-badge urgent">Due Today!</span>`;
            else badgeHTML = `<span class="days-badge urgent" style="background:#718096">Overdue</span>`;
        }

        itemDiv.innerHTML = `
            <div class="assignment-content" onclick="if('${task.subject}' !== 'none') scrollToSubject('${task.subject}')">
                <div class="exam-info">
                    <strong>${task.name}</strong><br>
                    ${new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
            </div>
            <div class="assignment-actions">
                ${badgeHTML}
                <button class="icon-btn" onclick="toggleTaskCompletion(${task.id})" title="Mark Complete">
                    ${task.completed ? '✅' : '⬜'}
                </button>
                <button class="icon-btn" onclick="editTask(${task.id})" title="Edit">✏️</button>
                <button class="icon-btn delete-btn" onclick="deleteTask(${task.id})" title="Delete">🗑️</button>
            </div>
        `;
        listContainer.appendChild(itemDiv);
    });

    localStorage.setItem('studyHubTasks', JSON.stringify(tasks));
}

// --- Task CRUD Operations ---
function saveTask() {
    const idInput = document.getElementById('task-id').value;
    const nameInput = document.getElementById('task-name').value;
    const dateInput = document.getElementById('task-date').value;
    const subjectInput = document.getElementById('task-subject').value;

    if (!nameInput || !dateInput) return alert("Please fill in both name and date.");

    if (idInput) {
        const taskIndex = tasks.findIndex(t => t.id == idInput);
        tasks[taskIndex] = { ...tasks[taskIndex], name: nameInput, date: dateInput, subject: subjectInput };
    } else {
        tasks.push({
            id: Date.now(), 
            name: nameInput,
            date: dateInput,
            subject: subjectInput,
            completed: false
        });
    }

    closeModal();
    renderTasks();
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    document.getElementById('modal-title').innerText = "Edit Task";
    document.getElementById('task-id').value = task.id;
    document.getElementById('task-name').value = task.name;
    document.getElementById('task-date').value = task.date;
    document.getElementById('task-subject').value = task.subject;
    document.getElementById('task-modal').style.display = 'flex';
}

function deleteTask(id) {
    if (confirm("Are you sure you want to delete this task?")) {
        tasks = tasks.filter(t => t.id !== id);
        renderTasks();
    }
}

function toggleTaskCompletion(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        renderTasks();
    }
}

function openModal() {
    document.getElementById('modal-title').innerText = "Add New Task";
    document.getElementById('task-id').value = '';
    document.getElementById('task-name').value = '';
    document.getElementById('task-date').value = '';
    document.getElementById('task-subject').value = 'none';
    document.getElementById('task-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('task-modal').style.display = 'none';
}

// --- UX Functions ---
function scrollToSubject(subjectId) {
    const element = document.getElementById(subjectId);
    if (element) {
        element.style.boxShadow = "0 0 0 4px rgba(49, 130, 206, 0.4)";
        setTimeout(() => element.style.boxShadow = "", 1500);
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function calculateDaysLeft() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const badges = document.querySelectorAll('.large-badge'); // Target fixed header badges

    badges.forEach(badge => {
        const targetDateStr = badge.getAttribute('data-date');
        const targetDate = new Date(targetDateStr);
        targetDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            badge.textContent = `${diffDays} Days Left`;
            if (diffDays <= 5) badge.classList.add('urgent'); 
        } else if (diffDays === 0) {
            badge.textContent = "Exam Today!";
            badge.classList.add('urgent');
        } else {
            badge.textContent = "Exam Completed";
            badge.style.background = "#48bb78"; 
            badge.style.boxShadow = "none";
        }
    });
}

function switchTab(event, tabId) {
    const subjectBlock = event.currentTarget.closest('.subject-block');
    const contents = subjectBlock.querySelectorAll('.tab-content');
    contents.forEach(content => content.classList.remove('active-content'));
    
    const buttons = subjectBlock.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    document.getElementById(tabId).classList.add('active-content');
    event.currentTarget.classList.add('active');
}

// --- Initialization & State Preservation ---
document.addEventListener('DOMContentLoaded', () => {
    renderTasks();
    calculateDaysLeft();

    // 1. Radio Buttons (Syllabus Trackers)
    const radioButtons = document.querySelectorAll('input[type="radio"]');
    radioButtons.forEach(radio => {
        const savedState = localStorage.getItem(radio.name);
        if (savedState && radio.value === savedState) {
            radio.checked = true;
            updateStyle(radio);
        }
        radio.addEventListener('change', (e) => {
            localStorage.setItem(e.target.name, e.target.value);
            updateStyle(e.target);
        });
    });

    // 2. Text Inputs & Textareas (Auto-save remarks)
    const textInputs = document.querySelectorAll('input.topic-remark, textarea.glass-textarea');
    textInputs.forEach(input => {
        const savedText = localStorage.getItem(input.name);
        if (savedText) input.value = savedText;

        input.addEventListener('input', (e) => {
            localStorage.setItem(e.target.name, e.target.value);
        });
    });
});

function updateStyle(radio) {
    const parentLi = radio.closest('li');
    if (!parentLi) return;
    
    if (radio.value === 'done') {
        parentLi.style.opacity = '0.4';
        parentLi.style.color = 'inherit';
    } else if (radio.value === 'revise') {
        parentLi.style.opacity = '1';
        parentLi.style.color = '#d69e2e'; 
        parentLi.style.fontWeight = '600';
    } else if (radio.value === 'to-cover') {
        parentLi.style.opacity = '1';
        parentLi.style.color = 'inherit';
        parentLi.style.fontWeight = 'normal';
    }
}