/**
 * Converte código hexadecimal para código ANSI
 */
function hexParaAnsi(codigoHex) {
	if (!/^#[0-9A-Fa-f]{6}$/.test(codigoHex)) {
		throw new Error('Código hex inválido. Deve ser no formato #RRGGBB.');
	}

	const r = parseInt(codigoHex.slice(1, 3), 16);
	const g = parseInt(codigoHex.slice(3, 5), 16);
	const b = parseInt(codigoHex.slice(5, 7), 16);

	if (isNaN(r) || isNaN(g) || isNaN(b) || r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
		throw new Error('Valores RGB fora do intervalo válido (0-255).');
	}

	return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Gera uma cor rainbow baseada no índice
 * @param {number} indice - Posição na sequência
 * @param {number} total - Total de caracteres
 * @returns {string} - Código ANSI da cor
 */
function obterCorRainbow(indice, total) {
	if (!process.stdout.isTTY) return '';

	const posicao = (indice / total) * 360;

	const h = posicao;
	const s = 100;
	const l = 50;

	const c = ((1 - Math.abs((2 * l) / 100 - 1)) * s) / 100;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l / 100 - c / 2;

	let r = 0,
		g = 0,
		b = 0;

	if (h < 60) {
		r = c;
		g = x;
		b = 0;
	} else if (h < 120) {
		r = x;
		g = c;
		b = 0;
	} else if (h < 180) {
		r = 0;
		g = c;
		b = x;
	} else if (h < 240) {
		r = 0;
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		g = 0;
		b = c;
	} else {
		r = c;
		g = 0;
		b = x;
	}

	r = Math.round((r + m) * 255);
	g = Math.round((g + m) * 255);
	b = Math.round((b + m) * 255);

	return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Aplica efeito rainbow em um texto
 * @param {string} texto - Texto a colorir
 * @returns {string} - Texto com cores rainbow
 */
function textoRainbow(texto) {
	if (!process.stdout.isTTY) return texto;

	const reset = Cores.reset;
	let resultado = '';
	const caracteres = texto.split('');

	for (let i = 0; i < caracteres.length; i++) {
		const cor = obterCorRainbow(i, caracteres.length);
		resultado += `${cor}${caracteres[i]}`;
	}

	return resultado + reset;
}

/**
 * Cores ANSI pré-definidas
 */
const Cores = {
	vermelho: process.stdout.isTTY ? '\x1b[31m' : '',
	verde: process.stdout.isTTY ? '\x1b[32m' : '',
	amarelo: process.stdout.isTTY ? '\x1b[33m' : '',
	azul: process.stdout.isTTY ? '\x1b[34m' : '',
	magenta: process.stdout.isTTY ? '\x1b[35m' : '',
	ciano: process.stdout.isTTY ? '\x1b[36m' : '',
	branco: process.stdout.isTTY ? '\x1b[37m' : '',
	reset: process.stdout.isTTY ? '\x1b[0m' : '',

	/**
	 * Retorna a cor ativa (verde claro)
	 */
	ativo() {
		return process.stdout.isTTY ? hexParaAnsi('#19e356') : '';
	},

	/**
	 * Retorna a cor principal do painel
	 */
	principal(corConfig) {
		try {
			if (corConfig && corConfig.toLowerCase() === 'rainbow') {
				return 'rainbow';
			}
			return process.stdout.isTTY ? hexParaAnsi(corConfig || '#faa7e8') : '';
		} catch {
			return process.stdout.isTTY ? hexParaAnsi('#faa7e8') : '';
		}
	}
};

/**
 * Símbolos formatados
 */
const Simbolos = {
	erro: process.stdout.isTTY ? `${Cores.vermelho}✖${Cores.reset}` : '✖',
	sucesso: process.stdout.isTTY ? `${Cores.verde}✔${Cores.reset}` : '✔',
	aviso: process.stdout.isTTY ? `${Cores.amarelo}⚠${Cores.reset}` : '⚠',
	info: process.stdout.isTTY ? `${Cores.ciano}ℹ${Cores.reset}` : 'ℹ',
	carregando: process.stdout.isTTY ? `${Cores.azul}⟳${Cores.reset}` : '~',
	download: process.stdout.isTTY ? `${Cores.magenta}⬇${Cores.reset}` : '↓',
	dica: process.stdout.isTTY ? `${Cores.amarelo}💡${Cores.reset}` : '💡',
	pergunta: process.stdout.isTTY ? `${Cores.ciano}❓${Cores.reset}` : '?'
};

module.exports = {
	hexParaAnsi,
	obterCorRainbow,
	textoRainbow,
	Cores,
	Simbolos
};
