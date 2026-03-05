// Progress Tracker Application
class ProgressTracker {
    constructor() {
        this.entries = [];
        this.currentView = 'all';
        this.loadFromStorage();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setTodayDate();
        this.renderTimeline();
        this.updateStats();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('entryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addEntry();
        });

        // Show/hide conditional fields based on entry type
        document.getElementById('entryType').addEventListener('change', (e) => {
            this.toggleConditionalFields(e.target.value);
        });

        // View navigation
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Export data
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        // Import data
        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e);
        });

        // Clear data
        document.getElementById('clearBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                this.clearAllData();
            }
        });

        // Modal close
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('imageModal');
            if (modal && e.target === modal) {
                modal.classList.remove('show');
            }
        });
    }

    switchView(view) {
        this.currentView = view;

        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        this.renderTimeline();
    }

    getFilteredEntries() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        switch(this.currentView) {
            case 'goals':
                return this.entries.filter(e => e.type === 'goal');
            case 'today':
                return this.entries.filter(e => {
                    const entryDate = new Date(e.date);
                    entryDate.setHours(0, 0, 0, 0);
                    return entryDate.getTime() === today.getTime();
                });
            case 'all':
            default:
                return this.entries;
        }
    }

    getTimelineTitle() {
        switch(this.currentView) {
            case 'goals':
                return 'Your Goals';
            case 'today':
                return 'Today\'s Changes';
            case 'all':
            default:
                return 'Your Timeline';
        }
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('entryDate').value = today;
    }

    toggleConditionalFields(type) {
        document.getElementById('evidenceField').classList.add('hidden');
        document.getElementById('resourceField').classList.add('hidden');

        if (type === 'evidence') {
            document.getElementById('evidenceField').classList.remove('hidden');
        } else if (type === 'resource') {
            document.getElementById('resourceField').classList.remove('hidden');
        }
    }

    addEntry() {
        const form = document.getElementById('entryForm');
        const entry = {
            id: Date.now(),
            date: document.getElementById('entryDate').value,
            type: document.getElementById('entryType').value,
            title: document.getElementById('entryTitle').value,
            description: document.getElementById('entryDescription').value,
            image: null,
            link: null
        };

        // Handle image upload
        const imageInput = document.getElementById('entryImage');
        if (imageInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (e) => {
                entry.image = e.target.result;
                this.entries.push(entry);
                this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
                this.saveToStorage();
                this.renderTimeline();
                this.updateStats();
                form.reset();
                this.setTodayDate();
            };
            reader.readAsDataURL(imageInput.files[0]);
        } else {
            // Handle resource link
            const linkInput = document.getElementById('entryLink');
            if (linkInput && linkInput.value) {
                entry.link = linkInput.value;
            }
            this.entries.push(entry);
            this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.saveToStorage();
            this.renderTimeline();
            this.updateStats();
            form.reset();
            this.setTodayDate();
        }
    }

    renderTimeline() {
        const timeline = document.getElementById('timeline');
        const filteredEntries = this.getFilteredEntries();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Update title
        document.getElementById('timelineTitle').textContent = this.getTimelineTitle();

        if (filteredEntries.length === 0) {
            let emptyMessage = '📝 No entries yet. Start documenting your progress!';
            if (this.currentView === 'goals') {
                emptyMessage = '🎯 No goals set yet. Create your first goal!';
            } else if (this.currentView === 'today') {
                emptyMessage = '📝 No changes recorded today yet. Start documenting!';
            }
            timeline.innerHTML = `<div class="timeline-empty">${emptyMessage}</div>`;
            return;
        }

        timeline.innerHTML = filteredEntries.map(entry => {
            const entryDate = new Date(entry.date);
            entryDate.setHours(0, 0, 0, 0);
            const isToday = entryDate.getTime() === today.getTime();
            const isFuture = entryDate > today;

            let content = `
                <div class="timeline-item ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-date">${this.formatDate(entry.date)}</div>
                        <span class="timeline-type ${entry.type}">${this.getTypeEmoji(entry.type)} ${this.getTypeLabel(entry.type)}</span>
                        <h3 class="timeline-title">${this.escapeHtml(entry.title)}</h3>
                        <p class="timeline-description">${this.escapeHtml(entry.description)}</p>
            `;

            if (entry.image) {
                content += `<img src="${entry.image}" alt="${this.escapeHtml(entry.title)}" class="timeline-image" onclick="tracker.openImageModal(this.src)">`;
            }

            if (entry.link) {
                content += `<a href="${this.escapeHtml(entry.link)}" target="_blank" class="timeline-link">🔗 ${this.escapeHtml(entry.link)}</a>`;
            }

            content += `<button class="btn btn-delete btn-small" onclick="tracker.deleteEntry(${entry.id})">Delete</button>`;
            content += `</div></div>`;

            return content;
        }).join('');
    }

    deleteEntry(id) {
        if (confirm('Are you sure you want to delete this entry?')) {
            this.entries = this.entries.filter(entry => entry.id !== id);
            this.saveToStorage();
            this.renderTimeline();
            this.updateStats();
        }
    }

    openImageModal(src) {
        const modal = document.createElement('div');
        modal.id = 'imageModal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <img src="${src}" alt="Evidence">
                <span class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</span>
            </div>
        `;
        document.body.appendChild(modal);
    }

    updateStats() {
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        const weekEntries = this.entries.filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekAgo && entryDate <= today;
        });

        const goalCount = weekEntries.filter(e => e.type === 'goal').length;
        const taskCount = weekEntries.filter(e => e.type === 'accomplished').length;
        const pivotCount = weekEntries.filter(e => e.type === 'pivot').length;
        const evidenceCount = weekEntries.filter(e => e.type === 'evidence').length;

        document.getElementById('goalCount').textContent = goalCount;
        document.getElementById('taskCount').textContent = taskCount;
        document.getElementById('pivotCount').textContent = pivotCount;
        document.getElementById('evidenceCount').textContent = evidenceCount;
    }

    getTypeLabel(type) {
        const labels = {
            goal: 'Goal',
            accomplished: 'Accomplished Task',
            pivot: 'Pivot Point',
            evidence: 'Visual Evidence',
            resource: 'Resource Link'
        };
        return labels[type] || type;
    }

    getTypeEmoji(type) {
        const emojis = {
            goal: '🎯',
            accomplished: '✅',
            pivot: '🔄',
            evidence: '📸',
            resource: '🔗'
        };
        return emojis[type] || '📝';
    }

    formatDate(dateString) {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', options);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Storage Management
    saveToStorage() {
        const dataToSave = this.entries.map(entry => ({
            ...entry,
            // Images are stored as data URLs which are already serializable
        }));
        localStorage.setItem('progressTrackerData', JSON.stringify(dataToSave));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('progressTrackerData');
        if (stored) {
            try {
                this.entries = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading stored data:', e);
                this.entries = [];
            }
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.entries, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `progress-tracker-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                if (Array.isArray(imported)) {
                    this.entries = imported;
                    this.entries.sort((a, b) => new Date(a.date) - new Date(b.date));
                    this.saveToStorage();
                    this.renderTimeline();
                    this.updateStats();
                    alert('✅ Data imported successfully!');
                } else {
                    alert('❌ Invalid file format. Please import a valid Progress Tracker backup.');
                }
            } catch (error) {
                alert('❌ Error importing file: ' + error.message);
            }
        };
        reader.readAsText(file);
        // Reset file input
        event.target.value = '';
    }

    clearAllData() {
        this.entries = [];
        this.saveToStorage();
        this.renderTimeline();
        this.updateStats();
        alert('✅ All data cleared!');
    }
}

// Initialize the app when DOM is ready
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new ProgressTracker();
});
