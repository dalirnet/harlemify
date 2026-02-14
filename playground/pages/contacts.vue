<script setup lang="ts">
import { contactStore, contactShape, type Contact } from "../stores/contact";

const showModal = ref(false);
const editing = ref<Contact | null>(null);
const form = ref(contactShape.defaults());

onMounted(() => contactStore.action.list());

function openCreate() {
    editing.value = null;
    form.value = contactShape.defaults();
    showModal.value = true;
}

function openEdit(contact: Contact) {
    editing.value = contact;
    form.value = contactShape.defaults({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
    });
    showModal.value = true;
}

async function save() {
    if (editing.value) {
        contactStore.model.current.set(editing.value);
        await contactStore.action.update({
            body: { first_name: form.value.first_name, last_name: form.value.last_name, email: form.value.email },
        });
    } else {
        await contactStore.action.create({
            body: { first_name: form.value.first_name, last_name: form.value.last_name, email: form.value.email },
        });
    }
    showModal.value = false;
}

async function remove(c: Contact) {
    if (confirm(`Delete "${c.first_name} ${c.last_name}"?`)) {
        contactStore.model.current.set(c);
        await contactStore.action.delete();
    }
}

async function select(c: Contact) {
    contactStore.model.current.set(c);
    await nextTick();
    await contactStore.action.get();
}

function clearSelection() {
    contactStore.model.current.reset();
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Contacts</h1>
            <p>Alias mapping with <code>meta({ alias })</code> — API uses kebab-case, store uses snake_case</p>
        </div>

        <div class="toolbar">
            <h2 data-testid="contact-count">{{ contactStore.view.count.value }} contacts</h2>
            <button class="btn btn-primary" data-testid="add-contact" @click="openCreate">Add Contact</button>
        </div>

        <div v-if="contactStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="contact-grid">
            <div
                v-for="c in contactStore.view.contacts.value"
                :key="c.id"
                class="card"
                :data-testid="`contact-${c.id}`"
            >
                <div class="card-body">
                    <h3 data-testid="contact-name">{{ c.first_name }} {{ c.last_name }}</h3>
                    <p class="subtitle" data-testid="contact-email">{{ c.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" data-testid="view-contact" @click="select(c)">View</button>
                    <button class="btn btn-sm" data-testid="edit-contact" @click="openEdit(c)">Edit</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-contact" @click="remove(c)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <div v-if="contactStore.view.contact.value.id" class="detail" data-testid="selected-contact">
            <h3>Selected Contact (view.contact)</h3>
            <pre>{{ JSON.stringify(contactStore.view.contact.value, null, 2) }}</pre>
            <button class="btn btn-sm" style="margin-top: 12px" data-testid="clear-contact" @click="clearSelection">
                Clear
            </button>
        </div>

        <!-- Action Status -->
        <div class="monitor-status" data-testid="action-status">
            <h3>Action Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item" data-testid="status-list">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="contactStore.action.list.status.value">{{
                        contactStore.action.list.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-get">
                    <span class="monitor-label">get</span>
                    <span class="monitor-state" :data-status="contactStore.action.get.status.value">{{
                        contactStore.action.get.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-create">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="contactStore.action.create.status.value">{{
                        contactStore.action.create.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-update">
                    <span class="monitor-label">update</span>
                    <span class="monitor-state" :data-status="contactStore.action.update.status.value">{{
                        contactStore.action.update.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-delete">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="contactStore.action.delete.status.value">{{
                        contactStore.action.delete.status.value
                    }}</span>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>meta({ alias: "first-name" })</code> - Shape-level key alias mapping</li>
                <li>API returns kebab-case keys (<code>first-name</code>, <code>last-name</code>)</li>
                <li>Store commits with snake_case keys (<code>first_name</code>, <code>last_name</code>)</li>
                <li>Outbound body automatically remaps snake_case → kebab-case</li>
                <li>Inbound response automatically remaps kebab-case → snake_case</li>
            </ul>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal" data-testid="contact-modal">
                <h2>{{ editing ? "Edit Contact" : "Add Contact" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>First Name</label>
                        <input v-model="form.first_name" required data-testid="input-first-name" >
                    </div>
                    <div class="form-group">
                        <label>Last Name</label>
                        <input v-model="form.last_name" required data-testid="input-last-name" >
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input v-model="form.email" type="email" required data-testid="input-email" >
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" data-testid="cancel-modal" @click="showModal = false">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" data-testid="save-contact">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
</style>
