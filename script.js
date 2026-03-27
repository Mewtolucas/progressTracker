// Progress Tracker Application - Multi-Project Version
class ProgressTracker {
    constructor() {
        this.projects = [];
        this.currentProjectId = null;
        this.currentFilter = 'all';
        this.isReadOnly = false;
        this.viewingSharedProject = null;
        this.loadFromStorage();
        this.checkForSharedProject();
        this.init();
    }

    init() {
        this.setupEventListeners();
        if (this.isReadOnly) {
            this.renderReadOnlyView();
        } else {
            this.renderProjects();
            this.selectFirstProject();
            this.renderTimeline();
        }
    }

    checkForSharedProject() {
        const params = new URLSearchParams(window.location.search);
        const shareCode = params.get('share');

        if (shareCode) {
            this.loadSharedProject(shareCode);
        }
    }

    loadSharedProject(shareCode) {
        const stored = localStorage.getItem('sharedProjects');
        if (!stored) return;

        try {
            const sharedProjects = JSON.parse(stored);
            const sharedData = sharedProjects[shareCode];

            if (sharedData) {
                this.viewingSharedProject = sharedData;
                this.isReadOnly = true;
                document.title = `Progress Tracker - ${sharedData.name} (Shared)`;
            }
        } catch (e) {
            console.error('Error loading shared project:', e);
        }
    }

    setupEventListeners() {
        // Project management
        document.getElementById('newProjectBtn').addEventListener('click', () => {
            this.openNewProjectModal();
        });

        document.getElementById('confirmProjectBtn').addEventListener('click', () => {
            this.createProject();
        });

        document.getElementById('cancelProjectBtn').addEventListener('click', () => {
            this.closeNewProjectModal();
        });

        document.getElementById('deleteProjectBtn').addEventListener('click', () => {
            this.deleteCurrentProject();
        });

        document.getElementById('shareProjectBtn').addEventListener('click', () => {
            this.openShareModal();
        });

        document.getElementById('copyShareLinkBtn').addEventListener('click', () => {
            this.copyShareLink();
        });

        document.getElementById('projectNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.createProject();
            }
        });

        // Form submission
        document.getElementById('quickAddForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addChange();
        });

        // Form field visibility
        document.getElementById('changeType').addEventListener('change', (e) => {
            this.toggleConditionalFields(e.target.value);
        });

        // Timeline filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchFilter(e.target.dataset.filter);
            });
        });

        // Export/Import
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('importBtn').addEventListener('click', () => {
            document.getElementById('importFile').click();
        });

        document.getElementById('importFile').addEventListener('change', (e) => {
            this.importData(e);
        });

        // Modal close
        document.getElementById('newProjectModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('newProjectModal')) {
                this.closeNewProjectModal();
            }
        });

        document.getElementById('shareModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('shareModal')) {
                this.closeShareModal();
            }
        });

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('show');
            });
        });
    }

    openNewProjectModal() {
        document.getElementById('projectNameInput').value = '';
        document.getElementById('projectNameInput').focus();
        document.getElementById('newProjectModal').classList.add('show');
    }

    closeNewProjectModal() {
        document.getElementById('newProjectModal').classList.remove('show');
    }

    createProject() {
        const name = document.getElementById('projectNameInput').value.trim();
        if (!name) {
            alert('Please enter a project name');
            return;
        }

        const project = {
            id: Date.now(),
            name: name,
            createdAt: new Date().toISOString(),
            entries: [],
            shareCode: null
        };

        this.projects.push(project);
        this.saveToStorage();
        this.renderProjects();
        this.selectProject(project.id);
        this.closeNewProjectModal();
    }

    deleteCurrentProject() {
        if (!this.currentProjectId) return;

        const project = this.projects.find(p => p.id === this.currentProjectId);
        if (!project) return;

        if (confirm(`Delete project "${project.name}"? This cannot be undone.`)) {
            this.projects = this.projects.filter(p => p.id !== this.currentProjectId);
            this.saveToStorage();
            this.renderProjects();
            this.selectFirstProject();
        }
    }

    generateShareCode() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    openShareModal() {
        if (!this.currentProjectId) return;

        const project = this.projects.find(p => p.id === this.currentProjectId);
        if (!project) return;

        // Generate share code if doesn't exist
        if (!project.shareCode) {
            project.shareCode = this.generateShareCode();
            this.saveToStorage();
        }

        // Store shared project data
        this.storeSharedProject(project);

        const shareLink = `${window.location.origin}${window.location.pathname}?share=${project.shareCode}`;
        document.getElementById('shareLink').value = shareLink;
        document.getElementById('shareModal').classList.add('show');
    }

    closeShareModal() {
        document.getElementById('shareModal').classList.remove('show');
    }

    storeSharedProject(project) {
        let sharedProjects = {};
        const stored = localStorage.getItem('sharedProjects');
        if (stored) {
            try {
                sharedProjects = JSON.parse(stored);
            } catch (e) {
                console.error('Error parsing shared projects:', e);
            }
        }

        sharedProjects[project.shareCode] = {
            id: project.id,
            name: project.name,
            entries: project.entries,
            sharedAt: new Date().toISOString()
        };

        localStorage.setItem('sharedProjects', JSON.stringify(sharedProjects));
    }

    copyShareLink() {
        const input = document.getElementById('shareLink');
        input.select();
        document.execCommand('copy');

        const btn = document.getElementById('copyShareLinkBtn');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    renderReadOnlyView() {
        if (!this.viewingSharedProject) return;

        const project = this.viewingSharedProject;

        // Hide editing controls
        document.querySelector('.quick-add-section').style.display = 'none';
        document.getElementById('deleteProjectBtn').style.display = 'none';
        document.getElementById('shareProjectBtn').style.display = 'none';
        document.querySelector('.project-controls').style.display = 'none';
        document.querySelector('.sidebar-footer').style.display = 'none';

        // Update header
        document.getElementById('projectTitle').textContent = '📊 ' + this.escapeHtml(project.name);
        document.getElementById('projectSubtitle').textContent = `${project.entries.length} entries (Shared View)`;

        // Hide projects list, show shared indicator
        const sidebar = document.querySelector('.sidebar');
        sidebar.innerHTML = `
            <div class="sidebar-header">
                <h1>📊 Shared Project</h1>
            </div>
            <div style="color: rgba(255,255,255,0.8); padding: 20px 0;">
                <p style="margin-bottom: 10px;">You're viewing a shared project.</p>
                <p style="font-size: 0.9em; opacity: 0.8;">All entries shown are read-only.</p>
            </div>
        `;

        this.currentFilter = 'all';
        this.renderTimeline();
    }

    selectProject(projectId) {
        this.currentProjectId = projectId;
        this.currentFilter = 'all';
        this.renderProjects();
        this.renderTimeline();
        this.updateProjectHeader();
    }

    selectFirstProject() {
        if (this.projects.length > 0) {
            this.selectProject(this.projects[0].id);
        }
    }

    updateProjectHeader() {
        const project = this.projects.find(p => p.id === this.currentProjectId);
        if (project) {
            document.getElementById('projectTitle').textContent = '📊 ' + this.escapeHtml(project.name);
            document.getElementById('projectSubtitle').textContent = `${project.entries.length} entries`;
        }
    }

    renderProjects() {
        const list = document.getElementById('projectsList');
        if (this.projects.length === 0) {
            list.innerHTML = '<p style="color: rgba(255,255,255,0.7); text-align: center; padding: 20px 0;">No projects yet</p>';
            return;
        }

        list.innerHTML = this.projects.map(project => {
            const isActive = project.id === this.currentProjectId;
            return `
                <div class="project-item ${isActive ? 'active' : ''}" data-id="${project.id}">
                    📁 ${this.escapeHtml(project.name)}
                </div>
            `;
        }).join('');

        document.querySelectorAll('.project-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectProject(parseInt(item.dataset.id));
            });
        });
    }

    toggleConditionalFields(type) {
        document.getElementById('goalDateField').classList.add('hidden');
        document.getElementById('resourceLinkField').classList.add('hidden');

        if (type === 'goal') {
            document.getElementById('goalDateField').classList.remove('hidden');
        } else if (type === 'resource') {
            document.getElementById('resourceLinkField').classList.remove('hidden');
        }
    }

    switchFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        this.renderTimeline();
    }

    addChange() {
        const project = this.projects.find(p => p.id === this.currentProjectId);
        if (!project) return;

        const today = new Date().toISOString().split('T')[0];
        const entry = {
            id: Date.now(),
            date: document.getElementById('changeDate').value || today,
            type: document.getElementById('changeType').value,
            title: document.getElementById('changeTitle').value,
            description: document.getElementById('changeDescription').value,
            dueDate: null,
            link: null
        };

        // Handle goal due date
        if (entry.type === 'goal') {
            const dueDate = document.getElementById('goalDueDate').value;
            if (dueDate) {
                entry.dueDate = dueDate;
            }
        }

        // Handle resource link
        if (entry.type === 'resource') {
            const link = document.getElementById('changeLink').value;
            if (link) {
                entry.link = link;
            }
        }

        project.entries.push(entry);
        project.entries.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.saveToStorage();
        this.renderTimeline();
        this.updateProjectHeader();
        this.resetForm();
    }

    resetForm() {
        document.getElementById('quickAddForm').reset();
        document.getElementById('changeDate').value = '';
        this.toggleConditionalFields('change');
    }

    parseLocalDate(dateString) {
        // Parse "YYYY-MM-DD" as local date, not UTC
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date;
    }

    getFilteredEntries() {
        const project = this.isReadOnly ? this.viewingSharedProject : this.projects.find(p => p.id === this.currentProjectId);
        if (!project) return [];

        switch(this.currentFilter) {
            case 'change':
                return project.entries.filter(e => e.type === 'change');
            case 'goal':
                return project.entries.filter(e => e.type === 'goal');
            case 'all':
            default:
                return project.entries;
        }
    }

    renderTimeline() {
        const timeline = document.getElementById('timeline');
        const filteredEntries = this.getFilteredEntries();

        // Get today's date in local timezone
        const todayDate = new Date();
        const today = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate());

        if (filteredEntries.length === 0) {
            let message = '📝 No entries yet. Add your first change!';
            if (this.currentFilter === 'goal') {
                message = '🎯 No goals set. Create one!';
            } else if (this.currentFilter === 'change') {
                message = '✅ No changes recorded yet.';
            }
            timeline.innerHTML = `<div class="timeline-empty">${message}</div>`;
            return;
        }

        // Group entries by date
        const entriesByDate = {};
        filteredEntries.forEach(entry => {
            if (!entriesByDate[entry.date]) {
                entriesByDate[entry.date] = [];
            }
            entriesByDate[entry.date].push(entry);
        });

        timeline.innerHTML = Object.keys(entriesByDate)
            .sort((a, b) => this.parseLocalDate(b) - this.parseLocalDate(a))
            .map(date => {
                const entries = entriesByDate[date];
                const entryDate = this.parseLocalDate(date);
                const isToday = entryDate.getTime() === today.getTime();
                const isFuture = entryDate > today;

                return entries.map((entry, idx) => {
                    let content = `
                        <div class="timeline-item ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}">
                            <div class="timeline-marker"></div>
                            <div class="timeline-content">
                                <div class="timeline-date">${idx === 0 ? this.formatDate(date) : ''}</div>
                                <span class="timeline-type ${entry.type}">${this.getTypeEmoji(entry.type)} ${this.getTypeLabel(entry.type)}</span>
                                <h3 class="timeline-title">${this.escapeHtml(entry.title)}</h3>
                    `;

                    if (entry.description) {
                        content += `<p class="timeline-description">${this.escapeHtml(entry.description)}</p>`;
                    }

                    if (entry.dueDate) {
                        const dueDateObj = new Date(entry.dueDate);
                        const dueDateFormatted = dueDateObj.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                        });
                        content += `<p class="timeline-due-date">📅 Due: ${dueDateFormatted}</p>`;
                    }

                    if (entry.link) {
                        content += `<a href="${this.escapeHtml(entry.link)}" target="_blank" class="timeline-link">🔗 ${this.escapeHtml(entry.link)}</a>`;
                    }

                    if (!this.isReadOnly) {
                        content += `<button class="btn btn-delete btn-small" onclick="tracker.deleteEntry(${entry.id})">Delete</button>`;
                    }
                    content += `</div></div>`;

                    return content;
                }).join('');
            }).join('');
    }

    deleteEntry(id) {
        if (this.isReadOnly) {
            alert('Cannot delete entries in read-only shared view.');
            return;
        }

        const project = this.projects.find(p => p.id === this.currentProjectId);
        if (!project) return;

        if (confirm('Delete this entry?')) {
            project.entries = project.entries.filter(e => e.id !== id);
            this.saveToStorage();
            this.renderTimeline();
            this.updateProjectHeader();
        }
    }

    getTypeLabel(type) {
        const labels = {
            change: 'Change Made',
            goal: 'Goal',
            pivot: 'Pivot Point',
            resource: 'Resource Link'
        };
        return labels[type] || type;
    }

    getTypeEmoji(type) {
        const emojis = {
            change: '✅',
            goal: '🎯',
            pivot: '🔄',
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
        localStorage.setItem('progressTrackerProjects', JSON.stringify(this.projects));
    }

    loadFromStorage() {
        const stored = localStorage.getItem('progressTrackerProjects');
        if (stored) {
            try {
                this.projects = JSON.parse(stored);
            } catch (e) {
                console.error('Error loading stored data:', e);
                this.projects = [];
            }
        }
    }

    exportData() {
        const dataStr = JSON.stringify(this.projects, null, 2);
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
                    this.projects = imported;
                    this.saveToStorage();
                    this.renderProjects();
                    this.selectFirstProject();
                    alert('✅ Data imported successfully!');
                } else {
                    alert('❌ Invalid file format.');
                }
            } catch (error) {
                alert('❌ Error importing file: ' + error.message);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }
}

// Initialize the app when DOM is ready
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new ProgressTracker();
});
