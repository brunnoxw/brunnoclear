const fs = require('fs');
const path = require('path');

function obterDiretorioExecutavel() {
	if (process.pkg) {
		return path.dirname(process.execPath);
	} else {
		return path.join(__dirname, '../..');
	}
}

function obterVersao() {
	try {
		const packagePath = path.join(__dirname, '../../package.json');
		const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
		return packageData.version;
	} catch (erro) {
		return '1.1.9';
	}
}

const CONFIG_PATH = path.join(obterDiretorioExecutavel(), 'config.json');

/**
 * Retorna a configuração padrão
 * @returns {Object} Configuração padrão
 */
function obterConfigPadrao() {
	return {
		tokens: [],
		rpc: {
			id_aplicacao: '1441501260984356907',
			detalhe: '>.<',
			estado: `/v${obterVersao()}`,
			nome: 'BrunnoClear',
			url_imagem: 'https://i.imgur.com/uTql7fj.jpeg',
			botoes: []
		},
		cor_painel: 'rainbow',
		delay: '1',
		esperar_fetch: true,
		desativar_rpc: false
	};
}

function criarConfig() {
	if (!fs.existsSync(CONFIG_PATH)) {
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(obterConfigPadrao(), null, 2));
	}
}

/**
 * Obtém a configuração atual
 * @returns {Object} Objeto de configuração
 */

function obterConfig() {
	try {
		const conteudo = fs.readFileSync(CONFIG_PATH, 'utf8');
		return JSON.parse(conteudo);
	} catch (erro) {
		console.error('Erro ao ler configuração:', erro);
		return obterConfigPadrao();
	}
}

/**
 * Salva a configuração
 * @param {Object} config - Objeto de configuração
 */
function salvarConfig(config) {
	try {
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4));
		return { sucesso: true };
	} catch (erro) {
		console.error('Erro ao salvar configuração:', erro);
		return { sucesso: false, mensagem: 'Erro ao salvar configuração' };
	}
}

/**
 * Adiciona um token à configuração
 * @param {string} nome - Nome para identificar o token
 * @param {string} token - Token do Discord
 * @returns {Object} Resultado da operação
 */
function adicionarToken(nome, token) {
	try {
		const config = obterConfig();

		const tokenExistente = config.tokens.find((t) => t.token === token);
		if (tokenExistente) {
			return {
				sucesso: false,
				mensagem: 'Este token já está cadastrado.'
			};
		}

		config.tokens.push({ nome, token });

		const resultado = salvarConfig(config);

		if (resultado.sucesso) {
			return {
				sucesso: true,
				mensagem: 'Token adicionado com sucesso!'
			};
		} else {
			return resultado;
		}
	} catch (erro) {
		console.error('Erro ao adicionar token:', erro);
		return {
			sucesso: false,
			mensagem: 'Erro ao adicionar token'
		};
	}
}

/**
 * Remove um token da configuração
 * @param {string} token - Token a ser removido
 * @returns {Object} Resultado da operação
 */
function removerToken(token) {
	try {
		const config = obterConfig();

		const tokensAtualizados = config.tokens.filter((t) => t.token !== token);

		if (tokensAtualizados.length === config.tokens.length) {
			return {
				sucesso: false,
				mensagem: 'Token não encontrado.'
			};
		}

		config.tokens = tokensAtualizados;

		const resultado = salvarConfig(config);

		if (resultado.sucesso) {
			return {
				sucesso: true,
				mensagem: 'Token removido com sucesso!'
			};
		} else {
			return resultado;
		}
	} catch (erro) {
		console.error('Erro ao remover token:', erro);
		return {
			sucesso: false,
			mensagem: 'Erro ao remover token'
		};
	}
}

/**
 * Atualiza a configuração
 * @param {string} chave - Chave a ser atualizada
 * @param {*} valor - Novo valor
 * @returns {Object} Resultado da operação
 */
function atualizarConfig(chave, valor) {
	try {
		const config = obterConfig();
		config[chave] = valor;
		return salvarConfig(config);
	} catch (erro) {
		console.error('Erro ao atualizar configuração:', erro);
		return {
			sucesso: false,
			mensagem: 'Erro ao atualizar configuração'
		};
	}
}

/**
 * Atualiza uma propriedade específica da configuração
 * @param {string} chave - Chave a ser atualizada
 * @param {*} valor - Novo valor
 * @returns {Object} Resultado da operação
 */
function atualizarPropriedade(chave, valor) {
	return atualizarConfig(chave, valor);
}

module.exports = {
	criarConfig,
	obterConfig,
	salvarConfig,
	adicionarToken,
	removerToken,
	atualizarConfig,
	atualizarPropriedade
};
