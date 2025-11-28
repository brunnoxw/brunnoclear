/**
 * Gerador de Backup HTML - Self-Contained
 * Gera HTML completo sem depender de templates externos
 */

/**
 * Retorna o template HTML base completo
 * @returns {string} - HTML base completo
 */
function gerarTemplateBase() {
	return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Discord Chat Backup</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.css">
    <script src="https://unpkg.com/lucide@latest"></script>
    <script src="https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js"></script>
    
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        :root {
            --discord-dark: #313338;
            --discord-darker: #2b2d31;
            --discord-darkest: #1e1f22;
            --discord-input-bg: #383a40;
            --discord-text: #dbdee1;
            --discord-text-muted: #b5bac1;
            --discord-text-link: #00a8fc;
            --discord-hover: #404249;
            --discord-blurple: #5865f2;
            --discord-green: #23a559;
            --discord-red: #f23f43;
            --discord-timestamp: #949ba4;
            --discord-mention-bg: rgba(88, 101, 242, 0.3);
            --discord-mention-hover: rgba(88, 101, 242, 0.5);
            --discord-attachment-bg: #2b2d31;
            --discord-divider: #3f4147;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--discord-dark);
            color: var(--discord-text);
            overflow-x: hidden;
        }
.attachment-video {
    margin: 8px 0;
    max-width: 600px;
}

.attachment-video video {
    display: block;
    max-width: 100%;
    max-height: 400px;
    background: #000;
    border-radius: 4px;
}

.video-info {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.video-download-link:hover {
    text-decoration: underline !important;
}

.attachment-audio {
    margin: 8px 0;
    max-width: 600px;
    background: var(--discord-attachment-bg);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--discord-darkest);
}

.audio-player {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.audio-info {
    display: flex;
    align-items: center;
    gap: 12px;
}

.audio-icon {
    width: 40px;
    height: 40px;
    background: var(--discord-blurple);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.audio-icon svg {
    width: 20px;
    height: 20px;
    color: white;
}

.audio-details {
    flex: 1;
    min-width: 0;
}

.audio-name {
    color: var(--discord-text);
    font-weight: 500;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.audio-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 2px;
}

.audio-size {
    color: var(--discord-text-muted);
    font-size: 12px;
}

.audio-duration {
    color: var(--discord-text-muted);
    font-size: 12px;
}

.attachment-audio audio {
    width: 100%;
    height: 32px;
    border-radius: 4px;
    outline: none;
}

.attachment-audio audio::-webkit-media-controls-panel {
    background-color: var(--discord-darkest);
}

.attachment-audio audio::-webkit-media-controls-play-button,
.attachment-audio audio::-webkit-media-controls-timeline,
.attachment-audio audio::-webkit-media-controls-current-time-display,
.attachment-audio audio::-webkit-media-controls-time-remaining-display,
.attachment-audio audio::-webkit-media-controls-mute-button,
.attachment-audio audio::-webkit-media-controls-volume-slider {
    filter: brightness(1.2);
}

.audio-download-link {
    color: var(--discord-text-link);
    text-decoration: none;
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-weight: 500;
}

.audio-download-link:hover {
    text-decoration: underline;
}

.attachment-file {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: rgba(47, 49, 54, 0.6);
    border-radius: 4px;
    margin: 4px 0;
}

.attachment-icon {
    font-size: 24px;
}

.attachment-info {
    flex: 1;
}

.attachment-name {
    color: #dcddde;
    font-weight: 500;
}

.attachment-size {
    color: #b9bbbe;
    font-size: 12px;
    margin-top: 2px;
}
        .chat-container {
            max-width: 100%;
            height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: var(--discord-dark);
        }

        .chat-header {
            height: auto;
            min-height: 48px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            border-bottom: 1px solid var(--discord-darkest);
            background-color: var(--discord-dark);
            box-shadow: 0 1px 0 rgba(4,4,5,0.2);
        }

        .backup-title {
            font-size: 20px;
            font-weight: 700;
            color: var(--discord-text);
            margin-bottom: 4px;
        }

        .backup-info {
            display: flex;
            align-items: center;
            gap: 16px;
            font-size: 13px;
            color: var(--discord-text-muted);
            flex-wrap: wrap;
        }

        .backup-info-item {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .backup-info-label {
            font-weight: 600;
            color: var(--discord-text);
        }

        .filter-bar {
            background-color: var(--discord-darker);
            border-bottom: 1px solid var(--discord-darkest);
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .search-box {
            flex: 1;
            min-width: 250px;
            position: relative;
        }

        .search-input {
            width: 100%;
            background-color: var(--discord-darkest);
            border: 1px solid transparent;
            border-radius: 4px;
            padding: 8px 12px 8px 36px;
            color: var(--discord-text);
            font-size: 14px;
            font-family: 'Inter', sans-serif;
            outline: none;
            transition: border-color 0.15s;
        }

        .search-input:focus { border-color: var(--discord-blurple); }
        .search-input::placeholder { color: var(--discord-text-muted); }

        .search-icon {
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--discord-text-muted);
        }

        .search-icon svg { width: 18px; height: 18px; }

        .filter-options {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .filter-label {
            font-size: 13px;
            color: var(--discord-text-muted);
            font-weight: 600;
        }

        .filter-btn {
            background-color: var(--discord-input-bg);
            border: 1px solid transparent;
            border-radius: 4px;
            padding: 6px 12px;
            color: var(--discord-text);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .filter-btn:hover {
            background-color: var(--discord-hover);
            border-color: var(--discord-text-muted);
        }

        .filter-btn.active {
            background-color: var(--discord-blurple);
            border-color: var(--discord-blurple);
            color: white;
        }

        .filter-btn .count {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 600;
        }

        .clear-filters {
            background-color: var(--discord-input-bg);
            border: 1px solid transparent;
            color: var(--discord-text);
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            padding: 6px 12px;
            border-radius: 4px;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .clear-filters:hover {
            background-color: var(--discord-red);
            border-color: var(--discord-red);
            color: white;
        }

        .search-results-info {
            background-color: var(--discord-input-bg);
            padding: 8px 16px;
            font-size: 13px;
            color: var(--discord-text-muted);
            border-bottom: 1px solid var(--discord-darkest);
            display: none;
        }

        .search-results-info.show { display: block; }
        .search-results-info strong { color: var(--discord-text); font-weight: 600; }

        .messages-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px 0;
        }

        .messages-container::-webkit-scrollbar { width: 14px; }
        .messages-container::-webkit-scrollbar-track { background-color: transparent; }
        .messages-container::-webkit-scrollbar-thumb {
            background-color: var(--discord-darkest);
            border: 3px solid var(--discord-dark);
            border-radius: 8px;
        }
        .messages-container::-webkit-scrollbar-thumb:hover { background-color: #1a1b1e; }

        .message-group {
            padding: 2px 16px 2px 72px;
            position: relative;
            min-height: 44px;
        }

        .message-group:hover { background-color: var(--discord-hover); }
        .message-group.first-message { margin-top: 16px; padding-top: 4px; }        .message-avatar {
            position: absolute;
            left: 16px;
            top: 4px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 16px;
            overflow: hidden;
        }

        .message-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 50%;
        }        .message-header {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 2px;
        }

        .message-username {
            font-size: 15px;
            font-weight: 500;
            color: var(--discord-text);
            cursor: pointer;
        }

        .message-username:hover { text-decoration: underline; }

        .message-timestamp {
            font-size: 12px;
            color: var(--discord-timestamp);
            font-weight: 400;
        }

        .message-content {
            font-size: 15px;
            line-height: 1.375;
            color: var(--discord-text);
            word-wrap: break-word;
        }

        .message-compact {
            padding: 0 16px 0 72px;
            min-height: 22px;
            position: relative;
        }

        .message-compact:hover { background-color: var(--discord-hover); }

        .message-compact .message-timestamp-hover {
            position: absolute;
            left: 16px;
            font-size: 11px;
            color: var(--discord-timestamp);
            opacity: 0;
            width: 40px;
            text-align: right;
            padding-right: 8px;
        }        .message-compact:hover .message-timestamp-hover { opacity: 1; }

        .message-group::before,
        .message-compact::before {
            content: attr(data-timestamp-formatted);
            position: absolute;
            left: 2px;
            top: 2px;
            font-size: 10px;
            color: var(--discord-timestamp);
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.15s;
            white-space: nowrap;
            background-color: rgba(0, 0, 0, 0.8);
            padding: 2px 6px;
            border-radius: 3px;
            z-index: 10;
        }

        .message-group:hover::before,
        .message-compact:hover::before {
            opacity: 1;
        }        .message-group.first-message::before {
            display: none;
        }

        .message-call {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 4px 16px;
            padding: 10px 16px;
            background: transparent;
            border-radius: 4px;
            transition: background-color 0.15s ease;
            min-height: 48px;
        }

        .message-call:hover {
            background: var(--discord-hover);
        }

        .message-call .call-icon {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: transform 0.2s ease;
        }

        .message-call:hover .call-icon {
            transform: scale(1.1);
        }

        .message-call .call-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 2px;
            min-width: 0;
        }

        .message-call .call-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .message-call .call-type {
            font-weight: 600;
            font-size: 15px;
            white-space: nowrap;
        }

        .message-call .call-timestamp {
            font-size: 11px;
            color: var(--discord-timestamp);
            font-weight: 500;
            white-space: nowrap;
        }

        .message-call .call-duration {
            font-size: 13px;
            color: var(--discord-text-muted);
            font-weight: 400;
        }

        .message-call.call-answered .call-icon {
            background: rgba(35, 165, 89, 0.15);
            color: #23a559;
        }

        .message-call.call-missed .call-icon {
            background: rgba(242, 63, 67, 0.15);
            color: #f23f43;
        }

        .mention {
            background-color: var(--discord-mention-bg);
            color: var(--discord-blurple);
            padding: 0 2px;
            border-radius: 3px;
            font-weight: 500;
            cursor: pointer;
        }

        .mention:hover {
            background-color: var(--discord-mention-hover);
            color: #ffffff;
        }

        .message-link {
            color: var(--discord-text-link);
            text-decoration: none;
        }

        .message-link:hover { text-decoration: underline; }

        .code-inline {
            background-color: var(--discord-darkest);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 14px;
        }

        .code-block {
            background-color: var(--discord-darkest);
            border: 1px solid var(--discord-darkest);
            border-radius: 4px;
            margin: 4px 0;
            overflow: hidden;
            position: relative;
        }

        .code-block pre {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
        }

        .code-block code {
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace !important;
            font-size: 14px !important;
            line-height: 1.4 !important;
            display: block;
            padding: 12px !important;
            overflow-x: auto;
        }

        .code-language {
            position: absolute;
            top: 8px;
            right: 8px;
            background-color: rgba(0, 0, 0, 0.4);
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 11px;
            color: var(--discord-text-muted);
            text-transform: uppercase;
            font-weight: 600;
            z-index: 1;
        }

        .message-attachments {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }        .attachment-image {
            max-width: 520px;
            max-height: 350px;
            width: auto;
            height: auto;
            border-radius: 4px;
            cursor: pointer;
            transition: transform 0.2s;
            object-fit: contain;
            background-color: var(--discord-darkest);
        }

        .attachment-image:hover { transform: scale(1.02); }

        .attachment-file {
            background-color: var(--discord-attachment-bg);
            border: 1px solid var(--discord-darkest);
            border-radius: 4px;
            padding: 16px;
            max-width: 400px;
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
        }

        .attachment-file:hover { background-color: var(--discord-hover); }

        .attachment-icon {
            width: 40px;
            height: 40px;
            background-color: var(--discord-blurple);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        }

        .attachment-info { flex: 1; }

        .attachment-name {
            font-size: 14px;
            font-weight: 500;
            color: var(--discord-text-link);
            margin-bottom: 2px;
        }

        .attachment-size {
            font-size: 12px;
            color: var(--discord-text-muted);
        }        .attachment-video {
            max-width: 400px;
            border-radius: 4px;
            overflow: hidden;
            background-color: var(--discord-darkest);
            position: relative;
        }

        .attachment-video video {
            width: 100%;
            display: block;
            background-color: #000;
        }

        .video-fallback {
            padding: 8px 12px;
            background-color: var(--discord-attachment-bg);
            border-top: 1px solid var(--discord-darkest);
        }

        .video-download-link {
            color: var(--discord-text-link);
            text-decoration: none;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
            font-weight: 500;
        }

        .video-download-link:hover {
            text-decoration: underline;
        }        .image-gallery {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            max-width: 520px;
            margin-top: 8px;
        }

        .image-gallery[data-count="1"] .gallery-item img { 
            max-width: 520px;
            max-height: 350px;
        }

        .gallery-item {
            position: relative;
            border-radius: 4px;
            cursor: pointer;
            background-color: transparent;
            overflow: visible;
        }        .gallery-item img {
            display: block;
            max-width: 250px;
            max-height: 250px;
            width: auto;
            height: auto;
            object-fit: contain;
            border-radius: 4px;
            transition: transform 0.2s;
            background-color: var(--discord-darkest);
        }        .gallery-item:hover img { transform: scale(1.03); }

        .message-stickers {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 8px;
        }

        .sticker-item {
            max-width: 160px;
            cursor: pointer;
            transition: transform 0.2s;
        }

        .sticker-item:hover {
            transform: scale(1.05);
        }

        .sticker-static,
        .sticker-animated {
            width: 100%;
            height: auto;
            display: block;
            border-radius: 4px;
        }

        lottie-player.sticker-lottie {
            cursor: pointer;
            transition: transform 0.2s;
        }

        lottie-player.sticker-lottie:hover {
            transform: scale(1.05);
        }

        .custom-emoji {
            width: 1.375em;
            height: 1.375em;
            vertical-align: bottom;
            margin: 0 0.05em;
        }

        .custom-emoji.animated {
            cursor: pointer;
        }

        .message-divider {
            display: flex;
            align-items: center;
            margin: 24px 16px;
            color: var(--discord-timestamp);
            font-size: 12px;
            font-weight: 600;
        }

        .message-divider::before, .message-divider::after {
            content: '';
            flex: 1;
            height: 1px;
            background-color: var(--discord-divider);
        }

        .message-divider span { padding: 0 16px; }

        .highlight {
            background-color: rgba(250, 166, 26, 0.3);
            color: #faa61a;
            padding: 2px 0;
            border-radius: 2px;
        }

        .message-group.hidden, .message-compact.hidden, .message-call.hidden, .message-divider.hidden { display: none; }

        html { scroll-behavior: smooth; }

        pre[class*="language-"] { background: var(--discord-darkest) !important; margin: 0 !important; padding: 12px !important; }
        code[class*="language-"] { background: transparent !important; color: #d4d4d4 !important; text-shadow: none !important; }
        .token.comment, .token.prolog, .token.doctype, .token.cdata { color: #6a9955 !important; }
        .token.punctuation { color: #d4d4d4 !important; }
        .token.property, .token.tag, .token.boolean, .token.number, .token.constant, .token.symbol, .token.deleted { color: #b5cea8 !important; }
        .token.selector, .token.attr-name, .token.string, .token.char, .token.builtin, .token.inserted { color: #ce9178 !important; }
        .token.operator, .token.entity, .token.url, .language-css .token.string, .style .token.string { color: #d4d4d4 !important; }
        .token.atrule, .token.attr-value, .token.keyword { color: #c586c0 !important; }
        .token.function, .token.class-name { color: #dcdcaa !important; }
        .token.regex, .token.important, .token.variable { color: #d16969 !important; }
    </style>
</head>
<body>
    <div class="chat-container">
        <!-- HEADER_PLACEHOLDER -->
        <!-- FILTER_BAR_PLACEHOLDER -->
        <!-- SEARCH_RESULTS_PLACEHOLDER -->
        <!-- MESSAGES_PLACEHOLDER -->
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/line-numbers/prism-line-numbers.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-javascript.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-python.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-java.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-csharp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-cpp.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-json.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-css.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-bash.min.js"></script>
    <!-- SCRIPTS_PLACEHOLDER -->
</body>
</html>`;
}

/**
 * Gera o HTML do header
 */
function gerarHeader(nomeUsuario, idUsuario, dataBackup, totalMensagens, totalAnexos) {
	return `        <div class="chat-header">
            <div class="backup-title">Backup da DM com o usuário: ${nomeUsuario} (ID: ${idUsuario})</div>
            <div class="backup-info">
                <div class="backup-info-item">
                    <span class="backup-info-label">📅 Data do backup:</span>
                    <span>${dataBackup}</span>
                </div>
                <div class="backup-info-item">
                    <span class="backup-info-label">💬 Total de mensagens:</span>
                    <span>${totalMensagens} mensagens</span>
                </div>
                <div class="backup-info-item">
                    <span class="backup-info-label">📎 Anexos:</span>
                    <span>${totalAnexos} arquivos</span>
                </div>
            </div>
        </div>`;
}

/**
 * Gera a barra de filtros
 */
function gerarBarraFiltros() {
	return `        <div class="filter-bar">
            <div class="search-box">
                <span class="search-icon">
                    <i data-lucide="search"></i>
                </span>
                <input type="text" class="search-input" id="searchInput" placeholder="Pesquisar mensagens...">
            </div>
            <div class="filter-options">
                <span class="filter-label">Filtrar:</span>
                <button class="filter-btn" data-filter="images">
                    <i data-lucide="image"></i> Imagens <span class="count" id="imageCount">0</span>
                </button>
                <button class="filter-btn" data-filter="files">
                    <i data-lucide="paperclip"></i> Arquivos <span class="count" id="fileCount">0</span>
                </button>
                <button class="filter-btn" data-filter="code">
                    <i data-lucide="code"></i> Código <span class="count" id="codeCount">0</span>
                </button>
                <button class="filter-btn" data-filter="links">
                    <i data-lucide="link"></i> Links <span class="count" id="linkCount">0</span>
                </button>
                <button class="clear-filters" id="clearFilters">
                    <i data-lucide="x"></i> Limpar filtros
                </button>
            </div>
        </div>`;
}

/**
 * Gera o container de resultados de busca
 */
function gerarSearchResults() {
	return `        <div class="search-results-info" id="searchResults">
            Encontradas <strong id="resultCount">0</strong> mensagens
        </div>`;
}

/**
 * Gera os scripts JavaScript
 */
function gerarScripts() {
	return `    <script>
        document.addEventListener('DOMContentLoaded', function() {
            const inputPesquisa = document.getElementById('searchInput');
            const resultadosPesquisa = document.getElementById('searchResults');
            const contagemResultados = document.getElementById('resultCount');
            const botoesFiltro = document.querySelectorAll('.filter-btn');
            const botaoLimparFiltros = document.getElementById('clearFilters');
            
            const contagemImagens = document.getElementById('imageCount');
            const contagemArquivos = document.getElementById('fileCount');
            const contagemCodigo = document.getElementById('codeCount');
            const contagemLinks = document.getElementById('linkCount');

            const todasMensagens = document.querySelectorAll('.message-group, .message-compact, .message-call');
            const todosDivisores = document.querySelectorAll('.message-divider');

            let filtroAtivo = null;

            function contarElementos() {
                let imagens = 0, arquivos = 0, codigos = 0, links = 0;
                
                todasMensagens.forEach(msg => {
                    if (msg.querySelector('.image-gallery, .attachment-image')) imagens++;
                    if (msg.querySelector('.attachment-file')) arquivos++;
                    if (msg.querySelector('.code-block')) codigos++;
                    if (msg.querySelector('.message-link')) links++;
                });

                contagemImagens.textContent = imagens;
                contagemArquivos.textContent = arquivos;
                contagemCodigo.textContent = codigos;
                contagemLinks.textContent = links;
            }

            function removerDestaques() {
                document.querySelectorAll('.highlight').forEach(el => {
                    const parent = el.parentNode;
                    parent.replaceChild(document.createTextNode(el.textContent), el);
                    parent.normalize();
                });
            }

            function destacarTexto(texto, termoPesquisa) {
                if (!termoPesquisa) return texto;
                const textoMinusculo = texto.toLowerCase();
                const pesquisaMinuscula = termoPesquisa.toLowerCase();
                let resultado = '';
                let ultimoIndice = 0;
                let indice = textoMinusculo.indexOf(pesquisaMinuscula);
                
                while (indice !== -1) {
                    resultado += texto.substring(ultimoIndice, indice);
                    resultado += '<span class="highlight">' + texto.substring(indice, indice + termoPesquisa.length) + '</span>';
                    ultimoIndice = indice + termoPesquisa.length;
                    indice = textoMinusculo.indexOf(pesquisaMinuscula, ultimoIndice);
                }
                
                resultado += texto.substring(ultimoIndice);
                return resultado;
            }

            function realizarPesquisa() {
                const termoPesquisa = inputPesquisa.value.trim().toLowerCase();
                removerDestaques();
                
                if (!termoPesquisa && !filtroAtivo) {
                    todasMensagens.forEach(msg => msg.classList.remove('hidden'));
                    todosDivisores.forEach(div => div.classList.remove('hidden'));
                    resultadosPesquisa.classList.remove('show');
                    return;
                }

                let contagemVisivel = 0;
                const mensagensParaMostrar = new Set();

                todasMensagens.forEach(msg => {
                    let deveMostrar = true;

                    if (filtroAtivo) {
                        deveMostrar = false;
                        if (filtroAtivo === 'images' && msg.querySelector('.image-gallery, .attachment-image')) deveMostrar = true;
                        else if (filtroAtivo === 'files' && msg.querySelector('.attachment-file')) deveMostrar = true;
                        else if (filtroAtivo === 'code' && msg.querySelector('.code-block')) deveMostrar = true;
                        else if (filtroAtivo === 'links' && msg.querySelector('.message-link')) deveMostrar = true;
                    }                    
                    if (deveMostrar && termoPesquisa) {
                        if (msg.classList.contains('message-call')) {
                            const textoChamada = msg.textContent.toLowerCase();
                            if (!textoChamada.includes(termoPesquisa)) {
                                deveMostrar = false;
                            }
                        } else {
                            const conteudo = msg.querySelector('.message-content');
                            if (conteudo) {
                                const texto = conteudo.textContent.toLowerCase();
                                if (texto.includes(termoPesquisa)) {
                                    const conteudoTexto = conteudo.textContent;
                                    const textoDestacado = destacarTexto(conteudoTexto, termoPesquisa);
                                    conteudo.innerHTML = textoDestacado;
                                } else {
                                    deveMostrar = false;
                                }
                            } else {
                                deveMostrar = false;
                            }
                        }
                    }

                    if (deveMostrar) {
                        mensagensParaMostrar.add(msg);
                        contagemVisivel++;
                    }
                });

                mensagensParaMostrar.forEach(msg => {
                    if (msg.classList.contains('message-compact')) {
                        let elementoAnterior = msg.previousElementSibling;
                        while (elementoAnterior) {
                            if (elementoAnterior.classList.contains('message-group') && elementoAnterior.classList.contains('first-message')) {
                                mensagensParaMostrar.add(elementoAnterior);
                                break;
                            }
                            if (elementoAnterior.classList.contains('message-compact')) {
                                mensagensParaMostrar.add(elementoAnterior);
                            }
                            elementoAnterior = elementoAnterior.previousElementSibling;
                        }
                    }
                });

                todasMensagens.forEach(msg => {
                    if (mensagensParaMostrar.has(msg)) msg.classList.remove('hidden');
                    else msg.classList.add('hidden');
                });              
                todosDivisores.forEach(divisor => {
                    let temProximoVisivel = false;
                    let proximoElemento = divisor.nextElementSibling;
                    
                    while (proximoElemento) {
                        if (proximoElemento.classList.contains('message-divider')) {
                            break;                        }
                        
                        if ((proximoElemento.classList.contains('message-group') 
                            || proximoElemento.classList.contains('message-compact')
                            || proximoElemento.classList.contains('message-call')) 
                            && !proximoElemento.classList.contains('hidden')) {
                            temProximoVisivel = true;
                            break;
                        }
                        
                        proximoElemento = proximoElemento.nextElementSibling;
                    }
                    
                    if (temProximoVisivel) {
                        divisor.classList.remove('hidden');
                    } else {
                        divisor.classList.add('hidden');
                    }
                });

                if (termoPesquisa || filtroAtivo) {
                    contagemResultados.textContent = contagemVisivel;
                    resultadosPesquisa.classList.add('show');
                } else {
                    resultadosPesquisa.classList.remove('show');
                }
            }

            inputPesquisa.addEventListener('input', realizarPesquisa);

            botoesFiltro.forEach(btn => {
                btn.addEventListener('click', function() {
                    const filtro = this.dataset.filter;
                    if (filtroAtivo === filtro) {
                        filtroAtivo = null;
                        this.classList.remove('active');
                    } else {
                        botoesFiltro.forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        filtroAtivo = filtro;
                    }
                    realizarPesquisa();
                });
            });

            botaoLimparFiltros.addEventListener('click', function() {
                inputPesquisa.value = '';
                filtroAtivo = null;
                botoesFiltro.forEach(btn => btn.classList.remove('active'));
                realizarPesquisa();
            });

            inputPesquisa.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    this.value = '';
                    realizarPesquisa();
                }
            });

            contarElementos();
            lucide.createIcons();

            const duracaoAudios = document.querySelectorAll('.audio-duration[data-audio-duration]');
            duracaoAudios.forEach(elementoDuracao => {
                const urlAudio = elementoDuracao.getAttribute('data-audio-duration');
                const reprodutorAudio = elementoDuracao.closest('.attachment-audio').querySelector('audio');
                
                if (reprodutorAudio) {
                    reprodutorAudio.addEventListener('loadedmetadata', function() {
                        const duracao = this.duration;
                        if (!isNaN(duracao) && isFinite(duracao)) {
                            const minutos = Math.floor(duracao / 60);
                            const segundos = Math.floor(duracao % 60);
                            elementoDuracao.textContent = minutos + ':' + String(segundos).padStart(2, '0');
                        } else {
                            elementoDuracao.textContent = '';
                        }
                    });
                    
                    reprodutorAudio.addEventListener('error', function() {
                        elementoDuracao.textContent = '';
                    });
                }
            });

            const mensagensComTimestamp = document.querySelectorAll('[data-timestamp]');
            mensagensComTimestamp.forEach(msg => {
                const timestamp = parseInt(msg.dataset.timestamp);
                if (timestamp) {
                    const data = new Date(timestamp);
                    const dia = String(data.getDate()).padStart(2, '0');
                    const mes = String(data.getMonth() + 1).padStart(2, '0');
                    const ano = data.getFullYear();
                    const hora = String(data.getHours()).padStart(2, '0');
                    const min = String(data.getMinutes()).padStart(2, '0');
                    const formatado = dia + '/' + mes + '/' + ano + ' ' + hora + ':' + min;
                    msg.setAttribute('data-timestamp-formatted', formatado);
                }
            });
        });
    </script>`;
}

module.exports = {
	gerarTemplateBase,
	gerarHeader,
	gerarBarraFiltros,
	gerarSearchResults,
	gerarScripts
};
