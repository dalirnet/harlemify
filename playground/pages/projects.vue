<script setup lang="ts">
import { projectStore, type Project, type ProjectMilestone } from "../stores/project";

const {
    project,
    projects,
    getProject,
    listProject,
    createProject,
    deleteProject,
    toggleProject,
    milestonesProject,
    metaProject,
    optionsProject,
    exportProject,
    projectMonitor,
    projectMemory,
} = useStoreAlias(projectStore);

// Form state
const showCreateModal = ref(false);
const newProjectName = ref("");
const newProjectDescription = ref("");

// Export result (action without memory)
const exportResult = ref<any>(null);

onMounted(() => listProject());

async function handleCreate() {
    await createProject({
        name: newProjectName.value,
        description: newProjectDescription.value,
    });
    newProjectName.value = "";
    newProjectDescription.value = "";
    showCreateModal.value = false;
}

async function handleSelect(p: Project) {
    exportResult.value = null;
    await getProject({ id: p.id });
}

async function handleDelete(p: Project) {
    if (confirm(`Delete "${p.name}"?`)) {
        await deleteProject({ id: p.id });
        if (project.value?.id === p.id) {
            projectMemory.set(null);
        }
    }
}

async function handleToggle() {
    if (!project.value) return;
    await toggleProject({ id: project.value.id });
}

// Nested path demonstrations
async function loadMilestones() {
    if (!project.value) return;
    await milestonesProject({ id: project.value.id });
}

async function loadMeta() {
    if (!project.value) return;
    await metaProject({ id: project.value.id });
}

async function loadOptions() {
    if (!project.value) return;
    await optionsProject({ id: project.value.id });
}

// Action without memory - just returns data
// Demonstrates call-time options: query params and custom headers
async function handleExport(format: "json" | "csv" = "json") {
    if (!project.value) return;
    exportResult.value = await exportProject(
        { id: project.value.id },
        {
            query: { format, includeStats: true },
            headers: { "X-Export-Request": "playground-demo" },
        },
    );
}

function clearSelection() {
    projectMemory.set(null);
    exportResult.value = null;
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Projects</h1>
            <p>
                Nested schema with <code>Memory.unit("field")</code> and
                <code>Memory.unit("field", "nested")</code>
            </p>
        </div>

        <div class="toolbar">
            <h2>{{ projects.length }} projects</h2>
            <button class="btn btn-primary" @click="showCreateModal = true">Add Project</button>
        </div>

        <div v-if="projectMonitor.list.pending()" class="loading">Loading...</div>

        <div v-else class="grid">
            <div v-for="p in projects" :key="p.id" class="card" :class="{ 'card-selected': project?.id === p.id }">
                <div class="card-body">
                    <h3>{{ p.name }}</h3>
                    <p class="subtitle">{{ p.description }}</p>
                    <p class="meta-info">
                        <span :class="['status-badge', p.active ? 'active' : 'inactive']">
                            {{ p.active ? "Active" : "Inactive" }}
                        </span>
                        <span class="milestone-count">
                            {{ p.milestones.filter((m: ProjectMilestone) => m.done).length }}/{{ p.milestones.length }}
                            milestones
                        </span>
                    </p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" @click="handleSelect(p)">Select</button>
                    <button class="btn btn-sm btn-danger" @click="handleDelete(p)">Delete</button>
                </div>
            </div>
        </div>

        <!-- Selected Project Detail -->
        <div v-if="project" class="detail">
            <div class="detail-header">
                <h3>Selected: {{ project.name }}</h3>
                <button class="btn btn-sm" @click="clearSelection">Clear</button>
            </div>

            <!-- Actions -->
            <div class="action-buttons">
                <button class="btn btn-sm" @click="handleToggle">
                    {{ project.active ? "Deactivate" : "Activate" }}
                </button>
                <button class="btn btn-sm" @click="loadMilestones">
                    Load Milestones <code>unit("milestones")</code>
                </button>
                <button class="btn btn-sm" @click="loadMeta">Load Meta <code>unit("meta")</code></button>
                <button class="btn btn-sm" @click="loadOptions">
                    Load Options <code>unit("meta", "options")</code>
                </button>
                <button class="btn btn-sm" @click="handleExport('json')">Export JSON <code>options.query</code></button>
                <button class="btn btn-sm" @click="handleExport('csv')">Export CSV <code>options.headers</code></button>
            </div>

            <!-- Raw State -->
            <div class="state-section">
                <h4>project (unit state)</h4>
                <pre>{{ JSON.stringify(project, null, 2) }}</pre>
            </div>

            <!-- Export Result (action without memory) -->
            <div v-if="exportResult" class="state-section export-result">
                <h4>Export Result (returned data, not stored in memory)</h4>
                <pre>{{ JSON.stringify(exportResult, null, 2) }}</pre>
            </div>
        </div>

        <!-- Monitor Status -->
        <div class="monitor-status" data-testid="monitor-status">
            <h3>Monitor Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item">
                    <span class="monitor-label">get</span>
                    <span class="monitor-state" :data-status="projectMonitor.get.current()">{{
                        projectMonitor.get.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="projectMonitor.get.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="projectMonitor.get.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="projectMonitor.get.success()" class="flag" data-flag="success">success</span>
                        <span v-if="projectMonitor.get.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="projectMonitor.list.current()">{{
                        projectMonitor.list.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="projectMonitor.list.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="projectMonitor.list.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="projectMonitor.list.success()" class="flag" data-flag="success">success</span>
                        <span v-if="projectMonitor.list.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="projectMonitor.create.current()">{{
                        projectMonitor.create.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="projectMonitor.create.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="projectMonitor.create.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="projectMonitor.create.success()" class="flag" data-flag="success">success</span>
                        <span v-if="projectMonitor.create.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="projectMonitor.delete.current()">{{
                        projectMonitor.delete.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="projectMonitor.delete.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="projectMonitor.delete.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="projectMonitor.delete.success()" class="flag" data-flag="success">success</span>
                        <span v-if="projectMonitor.delete.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">toggle</span>
                    <span class="monitor-state" :data-status="projectMonitor.toggle.current()">{{
                        projectMonitor.toggle.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="projectMonitor.toggle.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="projectMonitor.toggle.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="projectMonitor.toggle.success()" class="flag" data-flag="success">success</span>
                        <span v-if="projectMonitor.toggle.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">export</span>
                    <span class="monitor-state" :data-status="projectMonitor.export.current()">{{
                        projectMonitor.export.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="projectMonitor.export.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="projectMonitor.export.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="projectMonitor.export.success()" class="flag" data-flag="success">success</span>
                        <span v-if="projectMonitor.export.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
            </div>
        </div>

        <!-- Feature Explanation -->
        <div class="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li>
                    <code>Memory.unit("milestones")</code> - Loads data into
                    <code>project.milestones</code>
                </li>
                <li><code>Memory.unit("meta")</code> - Loads data into <code>project.meta</code></li>
                <li>
                    <code>Memory.unit("meta", "options")</code> - Loads data into
                    <code>project.meta.options</code> (2-level nesting)
                </li>
                <li><code>Memory.units().add({ prepend: true })</code> - New projects prepend to list</li>
                <li><strong>Action without memory</strong> - Export returns data without storing</li>
                <li>
                    <strong>Call-time options</strong> -
                    <code>action(params, { query, headers })</code>
                </li>
                <li><code>projectMonitor.[action].current()</code> - Current status enum value</li>
                <li><code>projectMonitor.[action].idle()/pending()/success()/failed()</code> - Boolean status flags</li>
            </ul>
        </div>

        <!-- Create Modal -->
        <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
            <div class="modal">
                <h2>Create Project</h2>
                <form @submit.prevent="handleCreate">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="newProjectName" required placeholder="Project name" >
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input v-model="newProjectDescription" placeholder="Description" >
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" @click="showCreateModal = false">Cancel</button>
                        <button type="submit" class="btn btn-primary">Create</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.card-selected {
    border-color: var(--primary);
    box-shadow: 0 0 0 2px var(--primary);
}

.meta-info {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 8px;
}

.status-badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 12px;
    color: white;
}

.status-badge.active {
    background-color: #22c55e;
}

.status-badge.inactive {
    background-color: #6b7280;
}

.milestone-count {
    color: var(--text-muted);
    font-size: 12px;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.action-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
}

.action-buttons code {
    font-size: 10px;
    opacity: 0.7;
}

.state-section {
    margin-top: 16px;
}

.state-section h4 {
    margin-bottom: 8px;
    font-size: 14px;
    color: var(--text-muted);
}

.export-result {
    background: var(--bg-tertiary);
    padding: 12px;
    border-radius: 8px;
}

.feature-info {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.feature-info h3 {
    margin-bottom: 12px;
}

.feature-info ul {
    margin: 0;
    padding-left: 20px;
}

.feature-info li {
    margin-bottom: 8px;
}

.feature-info code {
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
}

.monitor-status {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.monitor-status h3 {
    margin-bottom: 12px;
}

.monitor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
}

.monitor-label {
    font-weight: 600;
    font-size: 14px;
}

.monitor-state {
    font-family: monospace;
    font-size: 13px;
    color: var(--text-muted);
}

.monitor-flags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.flag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.flag[data-flag="idle"] {
    background: #6b7280;
    color: white;
}

.flag[data-flag="pending"] {
    background: #f59e0b;
    color: white;
}

.flag[data-flag="success"] {
    background: #10b981;
    color: white;
}

.flag[data-flag="failed"] {
    background: #ef4444;
    color: white;
}
</style>
