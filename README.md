# Prompt Manager

A lightweight AI prompt management tool with multi-language support (English / Chinese).

## Tech Stack

- **Frontend**: Pure HTML + CSS + JavaScript (SPA, no framework)
- **Backend**: PHP 7.4+
- **Database**: SQLite (zero-config)
- **CDN**: marked.js (Markdown), Chart.js (charts)

## Quick Start

### PHP Built-in Server (Recommended)

```bash
cd prompt-manager
php -S localhost:8080
```

Then open `http://localhost:8080` in your browser.

### Apache / Nginx

Copy the `prompt-manager` folder to your web root (e.g., `htdocs` or `www`). Ensure:

1. PHP has PDO SQLite extension enabled (`php_pdo_sqlite`)
2. The `data/` directory is writable

## Features

- **CRUD**: Create, edit, soft-delete prompts with list/card view toggle
- **Categories**: Tree structure with color tags
- **Tags**: Multi-tag system with tag cloud navigation
- **Search**: Full-text search across titles, content, and tags
- **Variable Templates**: `{{name|default}}` syntax with fill-in modal
- **One-Click Copy**: Auto-detect variables, record usage count
- **Import/Export**: JSON and Markdown formats
- **Trash**: Restore or permanently delete
- **Dashboard**: Stats cards, category chart, Top 10, usage history
- **Dark/Light Theme**: Toggle with persistent preference
- **Multi-Language**: English (default) / Chinese, toggle via top-right button
- **Keyboard Shortcuts**: `Ctrl+K` focus search, `Esc` close modals

## Language Support

- Default language: **English**
- Click the **EN / ��** button in the top-right corner to switch language
- Language preference is saved in localStorage

## Directory Structure

```
prompt-manager/
������ index.html              # SPA main page
������ css/style.css           # Styles (dark/light themes)
������ js/
��   ������ lang.js             # i18n translations (en/zh)
��   ������ app.js              # Main app logic
��   ������ api.js              # API wrapper
��   ������ promptEditor.js     # Editor + variable modal
��   ������ dashboard.js        # Dashboard charts
��   ������ utils.js            # Utilities
������ api/
��   ������ index.php           # API router
��   ������ prompts.php         # Prompt endpoints
��   ������ categories.php      # Category endpoints
��   ������ tags.php            # Tag endpoints
��   ������ export.php          # Export (JSON/MD)
��   ������ import.php          # Import (JSON)
��   ������ trash.php           # Trash endpoints
��   ������ stats.php           # Stats endpoints
������ includes/
��   ������ config.php          # Configuration
��   ������ db.php              # DB init + seed data
��   ������ helpers.php         # Helper functions
������ data/                   # SQLite database (auto-created)
```

## Seed Data

Created automatically on first run:

- **Categories**: Writing, Programming, Translation, Analysis, Creative (with sub-categories)
- **Tags**: GPT, Claude, General, Efficient, Template, Daily, Work, Study, Creative Writing, Code Generation
- **Prompts**: 12 practical templates covering all categories

## Configuration

Edit `includes/config.php`:

- Default: SQLite with auto-created database at `data/prompts.db`
- For MySQL: change `DB_TYPE` to `'mysql'` and fill in connection details
