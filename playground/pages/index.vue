<template>
    <div class="container">
        <header class="header">
            <h1>Harlemify</h1>
            <p>API State Management for Nuxt 3+</p>
        </header>

        <div class="home-grid">
            <NuxtLink to="/config" class="home-card">
                <h2>Config</h2>
                <p>Singleton store with <code>model.one()</code></p>
                <span class="badge">ActionOneMode</span>
            </NuxtLink>

            <NuxtLink to="/users" class="home-card">
                <h2>Users</h2>
                <p>Collection with <code>merge</code>, <code>commit</code>, <code>unique</code>, <code>by</code></p>
                <span class="badge">ActionManyMode + mutations</span>
            </NuxtLink>

            <NuxtLink to="/posts" class="home-card">
                <h2>Posts</h2>
                <p>Collection with <code>handle()</code> and <code>commit.mode</code> override</p>
                <span class="badge">handle + view.merge</span>
            </NuxtLink>

            <NuxtLink to="/contacts" class="home-card">
                <h2>Contacts</h2>
                <p>Alias mapping with <code>meta({ alias })</code> — kebab-case API, snake_case store</p>
                <span class="badge">alias + meta</span>
            </NuxtLink>

            <NuxtLink to="/projects" class="home-card">
                <h2>Projects</h2>
                <p>Concurrent, transformer, signal, bind, error handling</p>
                <span class="badge">advanced + concurrent</span>
            </NuxtLink>

            <NuxtLink to="/teams" class="home-card">
                <h2>Teams</h2>
                <p>Record model with <code>many(shape, { kind: "record" })</code></p>
                <span class="badge">ModelManyKind.RECORD</span>
            </NuxtLink>

            <NuxtLink to="/dashboard" class="home-card">
                <h2>Dashboard</h2>
                <p><code>compose()</code> — orchestrate actions, models, typed args</p>
                <span class="badge">compose</span>
            </NuxtLink>

            <NuxtLink to="/composables" class="home-card">
                <h2>Composables</h2>
                <p>
                    <code>useStoreAction</code>, <code>useStoreModel</code>, <code>useStoreView</code>,
                    <code>useStoreCompose</code>
                </p>
                <span class="badge">composables</span>
            </NuxtLink>
        </div>

        <footer class="footer">
            <a href="https://github.com/diphyx/harlemify" target="_blank">@diphyx/harlemify</a>
        </footer>
    </div>
</template>
