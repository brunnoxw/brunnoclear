/**
 * Serviço centralizado de Backup de Mensagens
 * Usado por todas as features que precisam fazer backup
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { sleep } = require('../utils/sleep');
const { Cores, Simbolos } = require('../utils/cores');
const { solicitarTexto } = require('../ui/menu');
const { atualizarPresenca } = require('./rpc');

function formatarDataArquivo(data) {
	const dia = String(data.getDate()).padStart(2, '0');
	const mes = String(data.getMonth() + 1).padStart(2, '0');
	const ano = data.getFullYear();
	const hora = String(data.getHours()).padStart(2, '0');
	const min = String(data.getMinutes()).padStart(2, '0');
	const seg = String(data.getSeconds()).padStart(2, '0');

	return `${dia}-${mes}-${ano}_${hora}-${min}-${seg}`;
}

function formatarDataExibicao(data) {
	const meses = [
		'janeiro',
		'fevereiro',
		'março',
		'abril',
		'maio',
		'junho',
		'julho',
		'agosto',
		'setembro',
		'outubro',
		'novembro',
		'dezembro'
	];

	const dia = data.getDate();
	const mes = meses[data.getMonth()];
	const ano = data.getFullYear();
	const hora = String(data.getHours()).padStart(2, '0');
	const min = String(data.getMinutes()).padStart(2, '0');

	return `${dia} de ${mes} de ${ano} às ${hora}:${min}`;
}

function formatarTamanho(bytes) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function escaparHTML(texto) {
	if (!texto) return '';
	return texto
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function baixarArquivo(url, caminhoDestino) {
	return new Promise((resolve, reject) => {
		const protocolo = url.startsWith('https') ? https : http;
		const arquivo = fs.createWriteStream(caminhoDestino);

		protocolo
			.get(url, (response) => {
				if (response.statusCode === 301 || response.statusCode === 302) {
					arquivo.close();
					fs.unlinkSync(caminhoDestino);
					return baixarArquivo(response.headers.location, caminhoDestino).then(resolve).catch(reject);
				}

				if (response.statusCode !== 200) {
					arquivo.close();
					fs.unlinkSync(caminhoDestino);
					reject(new Error(`Falha ao baixar: ${response.statusCode}`));
					return;
				}

				response.pipe(arquivo);

				arquivo.on('finish', () => {
					arquivo.close();
					resolve(true);
				});
			})
			.on('error', (err) => {
				arquivo.close();
				if (fs.existsSync(caminhoDestino)) {
					fs.unlinkSync(caminhoDestino);
				}
				reject(err);
			});
	});
}

function sanitizarNomeArquivo(nome) {
	return nome.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

/**
 * Pergunta se deseja fazer backup
 */
async function confirmarBackup(corPrincipal) {
	const reset = Cores.reset;
	const { textoRainbow } = require('../utils/cores');

	console.log(
		`\n        ${corPrincipal === 'rainbow' ? textoRainbow('╔═══════════════════════════════════════════════════════╗') : corPrincipal + '╔═══════════════════════════════════════════════════════╗' + reset}`
	);
	console.log(
		`        ${corPrincipal === 'rainbow' ? textoRainbow('║         FAZER BACKUP ANTES DE APAGAR?                ║') : corPrincipal + '║         FAZER BACKUP ANTES DE APAGAR?                ║' + reset}`
	);
	console.log(
		`        ${corPrincipal === 'rainbow' ? textoRainbow('╚═══════════════════════════════════════════════════════╝') : corPrincipal + '╚═══════════════════════════════════════════════════════╝' + reset}`
	);
	console.log(`\n        ${Simbolos.info} Deseja fazer um backup das mensagens antes de apagar?`);
	console.log(`        ${Simbolos.aviso} Isso criará um arquivo HTML com todas as mensagens.\n`);
	console.log(`        ${Cores.verde}[1]${reset} Sim, fazer backup`);
	console.log(`        ${Cores.vermelho}[2]${reset} Não, apenas apagar\n`);

	const resposta = solicitarTexto('');
	return resposta === '1';
}

/**
 * Pergunta se deseja baixar anexos localmente
 */
async function confirmarDownloadAnexos(corPrincipal, totalAnexos, tamanhoTotal) {
	const reset = Cores.reset;
	const { textoRainbow } = require('../utils/cores');

	console.log(
		`\n        ${corPrincipal === 'rainbow' ? textoRainbow('╔═══════════════════════════════════════════════════════╗') : corPrincipal + '╔═══════════════════════════════════════════════════════╗' + reset}`
	);
	console.log(
		`        ${corPrincipal === 'rainbow' ? textoRainbow('║         BAIXAR ANEXOS LOCALMENTE?                    ║') : corPrincipal + '║         BAIXAR ANEXOS LOCALMENTE?                    ║' + reset}`
	);
	console.log(
		`        ${corPrincipal === 'rainbow' ? textoRainbow('╚═══════════════════════════════════════════════════════╝') : corPrincipal + '╚═══════════════════════════════════════════════════════╝' + reset}`
	);
	console.log(
		`\n        ${Simbolos.info} Foram encontrados ${Cores.ciano}${totalAnexos}${reset} anexos (aprox. ${Cores.amarelo}${formatarTamanho(tamanhoTotal)}${reset})`
	);
	console.log(`\n        ${Simbolos.sucesso} ${Cores.verde}Vantagens:${reset} Os arquivos nunca expirarão`);
	console.log(
		`        ${Simbolos.aviso} ${Cores.amarelo}Desvantagens:${reset} Ocupará espaço em disco (${formatarTamanho(tamanhoTotal)})\n`
	);
	console.log(`        ${Cores.verde}[1]${reset} Sim, baixar anexos localmente (recomendado)`);
	console.log(`        ${Cores.amarelo}[2]${reset} Não, usar apenas URLs (podem expirar)\n`);

	const resposta = solicitarTexto('');
	return resposta === '1';
}

function criarEstruturaPastas(nomeUsuario, idUsuario, dataFormatada, comAnexos = false) {
	const nomePastaPrincipal = `${sanitizarNomeArquivo(nomeUsuario)}_${idUsuario}_${dataFormatada}`;
	const caminhoBackup = path.join(process.cwd(), 'backups', nomePastaPrincipal);

	if (!fs.existsSync(caminhoBackup)) {
		fs.mkdirSync(caminhoBackup, { recursive: true });
	}

	let caminhoAssets = null;
	if (comAnexos) {
		caminhoAssets = path.join(caminhoBackup, 'assets');
		if (!fs.existsSync(caminhoAssets)) {
			fs.mkdirSync(caminhoAssets, { recursive: true });
		}
	}

	return {
		pastaPrincipal: caminhoBackup,
		pastaAssets: caminhoAssets,
		nomePasta: nomePastaPrincipal
	};
}

async function processarAnexos(anexos, pastaAssets = null, progressCallback = null) {
	const anexosProcessados = [];
	let contador = 0;

	for (const anexo of anexos) {
		contador++;

		if (progressCallback) {
			await progressCallback(contador, anexos.length, anexo.name);
		}

		let urlFinal = anexo.url;

		if (pastaAssets) {
			try {
				const timestamp = Date.now();
				const nomeOriginal = sanitizarNomeArquivo(anexo.name);
				const nomeArquivo = `${timestamp}_${nomeOriginal}`;
				const caminhoCompleto = path.join(pastaAssets, nomeArquivo);

				await baixarArquivo(anexo.url, caminhoCompleto);
				urlFinal = `assets/${nomeArquivo}`;
			} catch (erro) {}
		}

		anexosProcessados.push({
			...anexo,
			urlProcessada: urlFinal
		});

		await sleep(0.1);
	}

	return anexosProcessados;
}

function calcularTamanhoTotal(mensagens) {
	let total = 0;

	for (const msg of mensagens) {
		if (msg.attachments && msg.attachments.size > 0) {
			msg.attachments.forEach((anexo) => {
				total += anexo.size || 0;
			});
		}
	}

	return total;
}

function gerarTemplateHTML() {
	const {
		gerarTemplateBase,
		gerarHeader,
		gerarBarraFiltros,
		gerarSearchResults,
		gerarScripts
	} = require('./backup-html');
	return {
		gerarTemplateBase,
		gerarHeader,
		gerarBarraFiltros,
		gerarSearchResults,
		gerarScripts
	};
}

function processarConteudo(conteudo) {
	if (!conteudo) return '';

	let processado = escaparHTML(conteudo);

	processado = processado.replace(/<(a?):([^:]+):(\d+)>/g, (match, animated, name, id) => {
		const isAnimated = animated === 'a';
		const ext = isAnimated ? 'gif' : 'png';
		const emojiUrl = `https://cdn.discordapp.com/emojis/${id}.${ext}?size=48&quality=lossless`;

		return `<img src="${emojiUrl}" 
                 alt=":${name}:" 
                 title=":${name}:"
                 class="custom-emoji${isAnimated ? ' animated' : ''}" 
                 loading="lazy">`;
	});

	processado = processado.replace(/```(\w+)?\n([\s\S]+?)```/g, (match, lang, code) => {
		const linguagem = lang || 'text';
		return `<div class="code-block">
      <span class="code-language">${linguagem}</span>
      <pre class="line-numbers"><code class="language-${linguagem}">${code.trim()}</code></pre>
    </div>`;
	});

	processado = processado.replace(/`([^`]+)`/g, '<span class="code-inline">$1</span>');

	processado = processado.replace(/@(\w+)/g, '<span class="mention">@$1</span>');

	processado = processado.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" class="message-link" target="_blank">$1</a>');

	processado = processado.replace(/\n/g, '<br>');

	return processado;
}

function gerarHTMLAnexos(anexosProcessados) {
	if (!anexosProcessados || anexosProcessados.length === 0) return '';

	const imagens = anexosProcessados.filter((a) => a.contentType && a.contentType.startsWith('image/'));
	const videos = anexosProcessados.filter((a) => a.contentType && a.contentType.startsWith('video/'));
	const audios = anexosProcessados.filter((a) => a.contentType && a.contentType.startsWith('audio/'));
	const arquivos = anexosProcessados.filter(
		(a) =>
			!a.contentType ||
			(!a.contentType.startsWith('image/') &&
				!a.contentType.startsWith('video/') &&
				!a.contentType.startsWith('audio/'))
	);

	let html = '';

	if (imagens.length > 0) {
		if (imagens.length === 1) {
			const img = imagens[0];
			html += `
                <div class="message-attachments">
                    <img src="${img.urlProcessada}" 
                         alt="${escaparHTML(img.name)}" 
                         width="${img.width || 'auto'}" 
                         height="${img.height || 'auto'}"
                         class="attachment-image" 
                         loading="lazy">
                </div>`;
		} else {
			html += `
                <div class="image-gallery" data-count="${imagens.length}">`;
			imagens.forEach((img) => {
				html += `
                    <div class="gallery-item" style="aspect-ratio: ${img.width || 1} / ${img.height || 1};">
                        <img src="${img.urlProcessada}" 
                             alt="${escaparHTML(img.name)}"
                             width="${img.width || 'auto'}" 
                             height="${img.height || 'auto'}"
                             loading="lazy">
                    </div>`;
			});
			html += `
                </div>`;
		}
	}

	if (videos.length > 0) {
		html += `
                <div class="message-attachments">`;
		videos.forEach((video) => {
			const ext = video.name.split('.').pop().toLowerCase();

			const mimeTypes = {
				mov: 'video/mp4',
				mp4: 'video/mp4',
				webm: 'video/webm',
				ogg: 'video/ogg',
				ogv: 'video/ogg',
				avi: 'video/x-msvideo',
				mkv: 'video/x-matroska',
				m4v: 'video/mp4'
			};

			const mimeType = mimeTypes[ext] || video.contentType || 'video/mp4';
			const isProblematic = ['mov', 'avi', 'mkv'].includes(ext);

			html += `
                    <div class="attachment-video">
                        <video controls 
                               preload="metadata" 
                               playsinline 
                               controlslist="nodownload"
                               style="max-width: 100%; border-radius: 4px;">
                            <source src="${video.urlProcessada}" type="${mimeType}">
                            ${isProblematic ? `<source src="${video.urlProcessada}" type="video/mp4">` : ''}
                            Seu navegador não suporta a reprodução deste vídeo.
                        </video>
                        <div class="video-info" style="margin-top: 8px; font-size: 12px; color: #b9bbbe;">
                            <span>📹 ${escaparHTML(video.name)}</span>
                            ${isProblematic ? '<span style="color: #faa61a;"> ⚠️ Este formato pode não funcionar em todos os navegadores</span>' : ''}
                        </div>
                        <div class="video-fallback" style="margin-top: 8px;">
                            <a href="${video.urlProcessada}" 
                               target="_blank" 
                               download="${escaparHTML(video.name)}" 
                               class="video-download-link"
                               style="color: #00b0f4; text-decoration: none; font-size: 13px;">
                                📥 Baixar vídeo (${formatarTamanho(video.size || 0)})
                            </a>
                        </div>
                    </div>`;
		});
		html += `
                </div>`;
	}

	if (audios.length > 0) {
		html += `
                <div class="message-attachments">`;
		audios.forEach((audio) => {
			const tamanho = formatarTamanho(audio.size || 0);
			const ext = audio.name.split('.').pop().toLowerCase();

			const mimeTypes = {
				mp3: 'audio/mpeg',
				ogg: 'audio/ogg',
				oga: 'audio/ogg',
				wav: 'audio/wav',
				flac: 'audio/flac',
				m4a: 'audio/mp4',
				aac: 'audio/aac',
				opus: 'audio/opus',
				webm: 'audio/webm'
			};

			const mimeType = mimeTypes[ext] || audio.contentType || 'audio/mpeg';

			html += `
                    <div class="attachment-audio">
                        <div class="audio-player">
                            <div class="audio-info">
                                <div class="audio-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M9 18V5l12-2v13"></path>
                                        <circle cx="6" cy="18" r="3"></circle>
                                        <circle cx="18" cy="16" r="3"></circle>
                                    </svg>
                                </div>
                                <div class="audio-details">
                                    <div class="audio-name">${escaparHTML(audio.name)}</div>
                                    <div class="audio-meta">
                                        <span class="audio-size">${tamanho}</span>
                                    </div>
                                </div>
                            </div>
                            <audio controls preload="metadata">
                                <source src="${audio.urlProcessada}" type="${mimeType}">
                                Seu navegador não suporta a reprodução de áudio.
                            </audio>
                            <a href="${audio.urlProcessada}" 
                               target="_blank" 
                               download="${escaparHTML(audio.name)}" 
                               class="audio-download-link">
                                📥 Baixar arquivo de áudio
                            </a>
                        </div>
                    </div>`;
		});
		html += `
                </div>`;
	}

	if (arquivos.length > 0) {
		html += `
                <div class="message-attachments">`;
		arquivos.forEach((arquivo) => {
			const tamanho = formatarTamanho(arquivo.size || 0);
			const ext = arquivo.name.split('.').pop().toLowerCase();
			const icone = obterIconeArquivo(ext);

			html += `
                    <div class="attachment-file">
                        <div class="attachment-icon">${icone}</div>
                        <div class="attachment-info">
                            <div class="attachment-name">${escaparHTML(arquivo.name)}</div>
                            <div class="attachment-size">${tamanho}</div>
                        </div>
                        <a href="${arquivo.urlProcessada}" 
                           target="_blank" 
                           download="${escaparHTML(arquivo.name)}"
                           style="margin-left: auto; color: #00b0f4; text-decoration: none;">
                            📥
                        </a>
                    </div>`;
		});
		html += `
                </div>`;
	}

	return html;
}

function obterIconeArquivo(extensao) {
	const icones = {
		pdf: '📄',
		doc: '📝',
		docx: '📝',
		xls: '📊',
		xlsx: '📊',
		ppt: '📊',
		pptx: '📊',
		txt: '📃',

		zip: '🗜️',
		rar: '🗜️',
		'7z': '🗜️',

		mp3: '🎵',
		wav: '🎵',
		ogg: '🎵',
		flac: '🎵',

		js: '💻',
		py: '💻',
		java: '💻',
		cpp: '💻',
		html: '🌐',
		css: '🎨',
		json: '📋'
	};
	return icones[extensao] || '📄';
}

/**
 * Gera HTML para mensagens de chamada
 */
function gerarHTMLChamada(msg, mesmoDia) {
	const data = new Date(msg.createdTimestamp);

	let separadorData = '';
	if (!mesmoDia) {
		const diasSemana = [
			'Domingo',
			'Segunda-feira',
			'Terça-feira',
			'Quarta-feira',
			'Quinta-feira',
			'Sexta-feira',
			'Sábado'
		];
		const meses = [
			'janeiro',
			'fevereiro',
			'março',
			'abril',
			'maio',
			'junho',
			'julho',
			'agosto',
			'setembro',
			'outubro',
			'novembro',
			'dezembro'
		];

		const diaSemana = diasSemana[data.getDay()];
		const dia = data.getDate();
		const mes = meses[data.getMonth()];
		const ano = data.getFullYear();

		separadorData = `
            <div class="message-divider">
                <span>${diaSemana}, ${dia} de ${mes} de ${ano}</span>
            </div>`;
	}

	const hora = String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0');
	const dataCompleta =
		String(data.getDate()).padStart(2, '0') +
		'/' +
		String(data.getMonth() + 1).padStart(2, '0') +
		'/' +
		data.getFullYear() +
		' ' +
		hora;

	let duracao = '';
	let duracaoTexto = 'Não atendida';
	let duracaoMs = 0;

	if (msg.call && msg.call.endedTimestamp) {
		duracaoMs = msg.call.endedTimestamp - msg.createdTimestamp;
		const segundos = Math.floor(duracaoMs / 1000);
		const minutos = Math.floor(segundos / 60);
		const horas = Math.floor(minutos / 60);

		if (horas > 0) {
			duracao = `${horas}h ${minutos % 60}min`;
		} else if (minutos > 0) {
			duracao = `${minutos} min ${segundos % 60} seg`;
		} else {
			duracao = `${segundos} seg`;
		}

		duracaoTexto = duracao;
	}

	const chamadaAtendida = duracaoMs > 5000;
	const iconeSvg = chamadaAtendida
		? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M9.36556 10.6821C10.302 12.3288 11.6712 13.698 13.3179 14.6344L14.2024 13.3961C14.4965 12.9845 15.0516 12.8573 15.4956 13.0998C16.9024 13.8683 18.4571 14.3353 20.0789 14.4637C20.599 14.5049 21 14.9389 21 15.4606V19.9234C21 20.4361 20.6122 20.8657 20.1022 20.9181C19.5723 20.9726 19.0377 21 18.5 21C9.93959 21 3 14.0604 3 5.5C3 4.96227 3.02742 4.42771 3.08189 3.89776C3.1343 3.38775 3.56394 3 4.07665 3H8.53942C9.0611 3 9.49513 3.40104 9.5363 3.92109C9.66467 5.54288 10.1317 7.09764 10.9002 8.50444C11.1427 8.9484 11.0155 9.50354 10.6039 9.79757L9.36556 10.6821Z"/></svg>`
		: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M21.1566 18.3477L19.2007 16.3918C18.9062 16.0973 18.4313 16.0973 18.1367 16.3918C17.8422 16.6864 17.8422 17.1613 18.1367 17.4558L20.0926 19.4117C20.2404 19.5595 20.4346 19.6334 20.6289 19.6334C20.8232 19.6334 21.0174 19.5595 21.1652 19.4117C21.4512 19.1172 21.4512 18.6423 21.1566 18.3477Z"/><path d="M3.83398 5.45508C4.12852 5.74961 4.60339 5.74961 4.89792 5.45508C5.19246 5.16054 5.19246 4.68567 4.89792 4.39114L2.94206 2.43527C2.64752 2.14074 2.17265 2.14074 1.87812 2.43527C1.58358 2.72981 1.58358 3.20468 1.87812 3.49921L3.83398 5.45508Z"/><path d="M8.86328 15.1211L9.36556 10.6821C10.302 12.3288 11.6712 13.698 13.3179 14.6344L14.2024 13.3961C14.4965 12.9845 15.0516 12.8573 15.4956 13.0998C16.9024 13.8683 18.4571 14.3353 20.0789 14.4637C20.599 14.5049 21 14.9389 21 15.4606V19.9234C21 20.4361 20.6122 20.8657 20.1022 20.9181C19.5723 20.9726 19.0377 21 18.5 21C9.93959 21 3 14.0604 3 5.5C3 4.96227 3.02742 4.42771 3.08189 3.89776C3.1343 3.38775 3.56394 3 4.07665 3H8.53942C9.0611 3 9.49513 3.40104 9.5363 3.92109C9.66467 5.54288 10.1317 7.09764 10.9002 8.50444C11.1427 8.9484 11.0155 9.50354 10.6039 9.79757L8.86328 15.1211Z"/></svg>`;

	const corIcone = chamadaAtendida ? '#23a559' : '#f23f43';
	const corBg = chamadaAtendida ? 'rgba(35, 165, 89, 0.1)' : 'rgba(242, 63, 67, 0.1)';

	return `${separadorData}
            <div class="message-call ${chamadaAtendida ? 'call-answered' : 'call-missed'}" data-timestamp="${msg.createdTimestamp}">
                <div class="call-icon" style="color: ${corIcone}; background: ${corBg};">
                    ${iconeSvg}
                </div>
                <div class="call-content">
                    <div class="call-header">
                        <span class="call-type" style="color: ${corIcone};">
                            ${chamadaAtendida ? 'Chamada de voz' : 'Chamada perdida'}
                        </span>
                        <span class="call-timestamp">${hora}</span>
                    </div>
                    <div class="call-duration">
                        ${duracaoTexto}
                    </div>
                </div>
            </div>`;
}

function gerarHTMLMensagem(msg, msgAnterior, anexosMap) {
	const data = new Date(msg.createdTimestamp);
	const dataAnterior = msgAnterior ? new Date(msgAnterior.createdTimestamp) : null;

	const mesmoDia =
		dataAnterior &&
		data.getDate() === dataAnterior.getDate() &&
		data.getMonth() === dataAnterior.getMonth() &&
		data.getFullYear() === dataAnterior.getFullYear();

	if (msg.type === 'CALL' && msg.call) {
		return gerarHTMLChamada(msg, mesmoDia);
	}

	let separadorData = '';
	if (
		!msgAnterior ||
		(dataAnterior &&
			(data.getDate() !== dataAnterior.getDate() ||
				data.getMonth() !== dataAnterior.getMonth() ||
				data.getFullYear() !== dataAnterior.getFullYear()))
	) {
		const diasSemana = [
			'Domingo',
			'Segunda-feira',
			'Terça-feira',
			'Quarta-feira',
			'Quinta-feira',
			'Sexta-feira',
			'Sábado'
		];
		const meses = [
			'janeiro',
			'fevereiro',
			'março',
			'abril',
			'maio',
			'junho',
			'julho',
			'agosto',
			'setembro',
			'outubro',
			'novembro',
			'dezembro'
		];

		const diaSemana = diasSemana[data.getDay()];
		const dia = data.getDate();
		const mes = meses[data.getMonth()];
		const ano = data.getFullYear();

		separadorData = `
            <div class="message-divider">
                <span>${diaSemana}, ${dia} de ${mes} de ${ano}</span>
            </div>`;
	}

	const isPrimeira =
		!msgAnterior || msgAnterior.author.id !== msg.author.id || data - new Date(msgAnterior.createdTimestamp) > 420000; // 7 minutos

	const conteudo = processarConteudo(msg.content);
	const hora = String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0');
	const dataCompleta =
		String(data.getDate()).padStart(2, '0') +
		'/' +
		String(data.getMonth() + 1).padStart(2, '0') +
		'/' +
		data.getFullYear() +
		' ' +
		hora;

	const avatarUrl = msg.author.displayAvatarURL({ format: 'png', size: 128 });
	const nomeExibicao = msg.author.globalName || msg.author.username;
	const corUsername = msg.author.bot ? '#5865f2' : '#3ba55d';

	const anexosProcessados = anexosMap.get(msg.id) || [];
	let htmlStickers = '';
	if (msg.stickers && msg.stickers.size > 0) {
		htmlStickers = '\n                <div class="message-stickers">';
		msg.stickers.forEach((sticker) => {
			const isLottie = sticker.format === 3 || sticker.format === 'LOTTIE';

			const ext = isLottie ? 'json' : 'png';
			let stickerUrl = `https://cdn.discordapp.com/stickers/${sticker.id}.${ext}`;

			if (isLottie) {
				stickerUrl = `https://long-glade-d22e.diabaodazl.workers.dev/?url=${encodeURIComponent(stickerUrl)}`;
			}

			if (isLottie) {
				htmlStickers += `
                    <div class="sticker-item" title="${escaparHTML(sticker.name)}">
                        <lottie-player src="${stickerUrl}" 
                                      background="transparent" 
                                      speed="1" 
                                      style="width: 160px; height: 160px;" 
                                      loop 
                                      autoplay
                                      class="sticker-lottie">
                        </lottie-player>
                    </div>`;
			} else {
				htmlStickers += `
                    <div class="sticker-item" title="${escaparHTML(sticker.name)}">
                        <img src="${stickerUrl}" 
                             alt="${escaparHTML(sticker.name)}" 
                             class="sticker-static"
                             loading="lazy">
                    </div>`;
			}
		});
		htmlStickers += '\n                </div>';
	}

	if (isPrimeira) {
		return `${separadorData}
            <div class="message-group first-message" data-timestamp="${msg.createdTimestamp}" title="${dataCompleta}">
                <div class="message-avatar">
                    <img src="${avatarUrl}" alt="${escaparHTML(nomeExibicao)}" style="width: 40px; height: 40px; border-radius: 50%;">
                </div>
                <div class="message-header">
                    <span class="message-username" style="color: ${corUsername};">${escaparHTML(nomeExibicao)}</span>
                    <span class="message-timestamp">${dataCompleta}</span>
                </div>
                ${conteudo ? `<div class="message-content">${conteudo}</div>` : ''}
                ${gerarHTMLAnexos(anexosProcessados)}${htmlStickers}
            </div>`;
	} else {
		return `
            <div class="message-compact" data-timestamp="${msg.createdTimestamp}" title="${dataCompleta}">
                <span class="message-timestamp-hover">${hora}</span>
                ${conteudo ? `<div class="message-content">${conteudo}</div>` : ''}
                ${gerarHTMLAnexos(anexosProcessados)}${htmlStickers}
            </div>`;
	}
}

/**
 * Cria backup de mensagens
 * @param {Array} mensagens - Array de mensagens
 * @param {string} nomeUsuario - Nome do usuário
 * @param {string} idUsuario - ID do usuário
 * @param {string} corPrincipal - Cor do painel
 * @param {boolean} perguntarDownload - Se deve perguntar sobre download de anexos
 * @param {boolean} baixarAnexosPreDefinido - Se download de anexos já foi definido (sobrescreve pergunta)
 * @returns {Promise<string>} - Caminho do arquivo HTML gerado
 */
async function criarBackup(
	mensagens,
	nomeUsuario,
	idUsuario,
	corPrincipal,
	perguntarDownload = true,
	baixarAnexosPreDefinido = null
) {
	const dataBackup = new Date();
	const dataFormatada = formatarDataArquivo(dataBackup);

	const todosAnexos = [];
	mensagens.forEach((msg) => {
		if (msg.attachments && msg.attachments.size > 0) {
			todosAnexos.push(...Array.from(msg.attachments.values()));
		}
	});

	const tamanhoTotal = calcularTamanhoTotal(mensagens);

	let baixarAnexos = false;
	if (baixarAnexosPreDefinido !== null) {
		baixarAnexos = baixarAnexosPreDefinido;
	} else if (perguntarDownload && todosAnexos.length > 0) {
		baixarAnexos = await confirmarDownloadAnexos(corPrincipal, todosAnexos.length, tamanhoTotal);
	}

	const { pastaPrincipal, pastaAssets } = criarEstruturaPastas(nomeUsuario, idUsuario, dataFormatada, baixarAnexos);

	console.log(`\n        ${Simbolos.info} Processando anexos...`);
	const anexosMap = new Map();

	const totalAnexosGlobal = mensagens.reduce((total, msg) => {
		return total + (msg.attachments ? msg.attachments.size : 0);
	}, 0);

	let contadorGlobal = 0;

	for (const msg of mensagens) {
		if (msg.attachments && msg.attachments.size > 0) {
			const anexosArray = Array.from(msg.attachments.values());
			const anexosProcessados = await processarAnexos(anexosArray, pastaAssets, async (atual, total, nome) => {
				contadorGlobal++;
				process.stdout.write(
					`\r        ${Simbolos.info} Processando anexo ${contadorGlobal}/${totalAnexosGlobal}: ${nome.substring(0, 30)}...`
				);
				await atualizarPresenca({
					detalhe: `Processando anexos: ${contadorGlobal}/${totalAnexosGlobal}`
				});
			});
			anexosMap.set(msg.id, anexosProcessados);
		}
	}

	console.log(`\n        ${Simbolos.sucesso} Anexos processados!`);
	console.log(`\n        ${Simbolos.info} Gerando HTML...`);

	const { gerarTemplateBase, gerarHeader, gerarBarraFiltros, gerarSearchResults, gerarScripts } = gerarTemplateHTML();

	const mensagensOrdenadas = [...mensagens].reverse();

	let htmlMensagens = '        <div class="messages-container">\n';
	for (let i = 0; i < mensagensOrdenadas.length; i++) {
		const msg = mensagensOrdenadas[i];
		const msgAnterior = i > 0 ? mensagensOrdenadas[i - 1] : null;
		htmlMensagens += gerarHTMLMensagem(msg, msgAnterior, anexosMap);
	}
	htmlMensagens += '\n        </div>';

	let html = gerarTemplateBase();
	html = html.replace(
		'<!-- HEADER_PLACEHOLDER -->',
		gerarHeader(
			escaparHTML(nomeUsuario),
			idUsuario,
			formatarDataExibicao(dataBackup),
			mensagens.length,
			todosAnexos.length
		)
	);
	html = html.replace('<!-- FILTER_BAR_PLACEHOLDER -->', gerarBarraFiltros());
	html = html.replace('<!-- SEARCH_RESULTS_PLACEHOLDER -->', gerarSearchResults());
	html = html.replace('<!-- MESSAGES_PLACEHOLDER -->', htmlMensagens);
	html = html.replace('<!-- SCRIPTS_PLACEHOLDER -->', gerarScripts());

	const nomeArquivo = `backup_${sanitizarNomeArquivo(nomeUsuario)}_${dataFormatada}.html`;
	const caminhoArquivo = path.join(pastaPrincipal, nomeArquivo);

	fs.writeFileSync(caminhoArquivo, html, 'utf-8');

	console.log(`\n        ${Simbolos.sucesso} Backup salvo em: ${Cores.verde}${caminhoArquivo}${Cores.reset}`);

	await atualizarPresenca({
		detalhe: `Backup criado: ${mensagens.length} mensagens`
	});

	return caminhoArquivo;
}

module.exports = {
	confirmarBackup,
	criarBackup,
	formatarTamanho,
	calcularTamanhoTotal
};
