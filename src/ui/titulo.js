const { Cores, textoRainbow } = require('../utils/cores');
const fs = require('fs');
const path = require('path');

let asciiArt = [];
try {
	const asciiPath = path.join(__dirname, 'titulo.txt');
	const asciiContent = fs.readFileSync(asciiPath, 'utf8');
	asciiArt = asciiContent.split('\n').filter((line) => line.trim().length > 0);
} catch (error) {
	asciiArt = [
		'▄▄▄▄  ▄▄▄▄  ▄▄ ▄▄ ▄▄  ▄▄ ▄▄  ▄▄  ▄▄▄   ▄▄▄▄ ▄▄    ▄▄▄▄▄  ▄▄▄  ▄▄▄▄',
		'██▄██ ██▄█▄ ██ ██ ███▄██ ███▄██ ██▀██ ██▀▀▀ ██    ██▄▄  ██▀██ ██▄█▄',
		'██▄█▀ ██ ██ ▀███▀ ██ ▀██ ██ ▀██ ▀███▀ ▀████ ██▄▄▄ ██▄▄▄ ██▀██ ██ ██'
	];
}

/**
 * Exibe o título ASCII do programa
 * @param {string} nomeUsuario - Nome do usuário
 * @param {string} idUsuario - ID do usuário
 * @param {string} corPrincipal - Cor principal do painel
 */
function exibirTitulo(nomeUsuario, idUsuario, corPrincipal) {
	const reset = Cores.reset;
	console.log('\n');

	if (corPrincipal === 'rainbow') {
		asciiArt.forEach((linha) => {
			console.log('        ' + textoRainbow(linha));
		});
	} else {
		const cor = corPrincipal;
		const branco = Cores.branco;

		asciiArt.forEach((linha) => {
			const meio = Math.floor(linha.length / 2);
			const primeiraMetade = linha.substring(0, meio);
			const segundaMetade = linha.substring(meio);

			console.log(`        ${cor}${primeiraMetade}${reset}${branco}${segundaMetade}${reset}`);
		});
	}

	console.log('\n');

	if (corPrincipal === 'rainbow') {
		console.log(`        ${textoRainbow('Usuário:')} ${nomeUsuario}`);
		console.log(`        ${textoRainbow('ID:')} ${idUsuario}\n`);
	} else {
		const cor = corPrincipal;
		console.log(`        ${cor}Usuário:${reset} ${nomeUsuario}`);
		console.log(`        ${cor}ID:${reset} ${idUsuario}\n`);
	}
}

/**
 * Exibe uma barra de progresso
 * @param {number} contador - Valor atual
 * @param {number} total - Valor total
 * @param {string} textoProgresso - Texto descritivo
 * @param {string} textoComplementar - Texto adicional
 * @param {string} corPrincipal - Cor da barra
 */
function exibirBarraProgresso(contador, total, textoProgresso = '', textoComplementar = '', corPrincipal) {
	const porcentagem = (contador / total) * 100;
	const barraCheia = Math.floor(porcentagem / 2);
	const barraVazia = 50 - barraCheia;

	const barra = '[' + '█'.repeat(barraCheia) + '░'.repeat(barraVazia) + ']';
	const reset = Cores.reset;

	if (corPrincipal === 'rainbow') {
		console.log(
			`${textoComplementar ? `${textoComplementar}` : ''}${textoRainbow(barra)} | ${porcentagem.toFixed(2)}% | ${contador}/${total} ${textoProgresso}`
		);
	} else {
		const cor = corPrincipal;
		console.log(
			`${textoComplementar ? `${textoComplementar}` : ''}${cor}${barra}${reset} | ${porcentagem.toFixed(2)}% | ${contador}/${total} ${textoProgresso}`
		);
	}
}

/**
 * Limpa o console e exibe título com barra de progresso
 */
async function exibirProgressoCompleto(
	contador,
	total,
	tituloJanela,
	textoProgresso,
	textoComplementar = '',
	cliente,
	corPrincipal
) {
	process.title = `${tituloJanela} | ${contador}/${total} ${textoProgresso}`;

	console.clear();
	exibirTitulo(cliente?.user?.username || 'Desconhecido', cliente?.user?.id || '0', corPrincipal);

	exibirBarraProgresso(contador, total, textoProgresso, textoComplementar, corPrincipal);
}

/**
 * Exibe título com DUAS barras de progresso (para package)
 * @param {number} dmAtual - DM atual
 * @param {number} totalDMs - Total de DMs
 * @param {number} msgAtual - Mensagem atual
 * @param {number} totalMsgs - Total de mensagens na DM atual
 * @param {string} textoComplementar - Texto adicional
 * @param {Object} cliente - Cliente Discord
 * @param {string} corPrincipal - Cor principal
 */
async function exibirProgressoDuplo(dmAtual, totalDMs, msgAtual, totalMsgs, textoComplementar, cliente, corPrincipal) {
	const porcentagemDMs = (dmAtual / totalDMs) * 100;
	const porcentagemMsgs = totalMsgs > 0 ? (msgAtual / totalMsgs) * 100 : 0;

	const barraCheiaDMs = Math.floor(porcentagemDMs / 2);
	const barraVaziaDMs = 50 - barraCheiaDMs;

	const barraCheiaMsg = Math.floor(porcentagemMsgs / 2);
	const barraVaziaMsg = 50 - barraCheiaMsg;

	const barraDMs = '[' + '█'.repeat(barraCheiaDMs) + '░'.repeat(barraVaziaDMs) + ']';
	const barraMsgs = '[' + '█'.repeat(barraCheiaMsg) + '░'.repeat(barraVaziaMsg) + ']';

	const reset = Cores.reset;

	process.title = `BrunnoClear | Package ${dmAtual}/${totalDMs} DMs | ${msgAtual}/${totalMsgs} msgs`;
	console.clear();
	exibirTitulo(cliente?.user?.username || 'Desconhecido', cliente?.user?.id || '0', corPrincipal);

	if (textoComplementar) {
		console.log();
		console.log(textoComplementar);
	}

	if (corPrincipal === 'rainbow') {
		console.log(
			`${textoRainbow(barraMsgs)} | ${porcentagemMsgs.toFixed(2)}% | ${msgAtual}/${totalMsgs} mensagens nesta DM`
		);
	} else {
		const cor = corPrincipal;
		console.log(
			`${cor}${barraMsgs}${reset} | ${porcentagemMsgs.toFixed(2)}% | ${msgAtual}/${totalMsgs} mensagens nesta DM`
		);
	}

	if (corPrincipal === 'rainbow') {
		console.log(`${textoRainbow(barraDMs)} | ${porcentagemDMs.toFixed(2)}% | ${dmAtual}/${totalDMs} DMs processadas`);
	} else {
		const cor = corPrincipal;
		console.log(`${cor}${barraDMs}${reset} | ${porcentagemDMs.toFixed(2)}% | ${dmAtual}/${totalDMs} DMs processadas`);
	}
}

module.exports = {
	exibirTitulo,
	exibirBarraProgresso,
	exibirProgressoCompleto,
	exibirProgressoDuplo
};
