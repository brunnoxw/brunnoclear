/**
 * Componentes de UI centralizados
 * Evita duplicação de código de interface em todo o projeto
 */

const { Cores, textoRainbow, Simbolos } = require('./cores');
const CONSTANTS = require('../config/constants');

/**
 * Classe para gerenciar componentes de UI
 */
class UIComponents {
	/**
	 * Aplica cor ao texto (método base interno)
	 * @private
	 * @param {string} texto - Texto a colorir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 * @returns {string} - Texto colorido
	 */
	static _aplicarCor(texto, corPrincipal) {
		if (corPrincipal === CONSTANTS.COLORS.RAINBOW) {
			return textoRainbow(texto);
		}
		return `${corPrincipal}${texto}${Cores.reset}`;
	}

	/**
	 * Exibe texto com padding e cor (método base genérico)
	 * @private
	 * @param {string} texto - Texto a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 * @param {boolean} aplicarCor - Se deve aplicar cor ao texto
	 */
	static _exibirTexto(texto, corPrincipal, aplicarCor = false) {
		const padding = CONSTANTS.UI.PADDING;
		const textoFinal = aplicarCor ? this._aplicarCor(texto, corPrincipal) : texto;
		console.log(`${padding}${textoFinal}`);
	}

	/**
	 * Exibe mensagem com símbolo (método base genérico)
	 * @private
	 * @param {string} simbolo - Símbolo a exibir
	 * @param {string} mensagem - Mensagem a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 * @param {boolean} colorirMensagem - Se deve colorir a mensagem toda
	 */
	static _exibirComSimbolo(simbolo, mensagem, corPrincipal, colorirMensagem = false) {
		const padding = CONSTANTS.UI.PADDING;
		const space = CONSTANTS.UI.SPACE;
		const textoFinal = colorirMensagem ? this._aplicarCor(mensagem, corPrincipal) : mensagem;
		console.log(`${padding}${simbolo}${space}${textoFinal}`);
	}

	/**
	 * Exibe um cabeçalho formatado
	 * @param {string} titulo - Título a exibir (centralizado)
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirCabecalho(titulo, corPrincipal) {
		const sep = CONSTANTS.UI.SEPARATOR;
		const padding = CONSTANTS.UI.PADDING;
		const sepColorido = this._aplicarCor(sep, corPrincipal);
		const tituloColorido = this._aplicarCor(titulo, corPrincipal);

		console.log(`\n${padding}${sepColorido}`);
		console.log(`${padding}${tituloColorido}`);
		console.log(`${padding}${sepColorido}`);
	}

	/**
	 * Exibe apenas o separador
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirSeparador(corPrincipal) {
		this._exibirTexto(CONSTANTS.UI.SEPARATOR, corPrincipal, true);
	}

	/**
	 * Exibe uma mensagem informativa
	 * @param {string} mensagem - Mensagem a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirInfo(mensagem, corPrincipal) {
		this._exibirComSimbolo(Simbolos.info, mensagem, corPrincipal, false);
	}

	/**
	 * Exibe uma mensagem de sucesso
	 * @param {string} mensagem - Mensagem a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirSucesso(mensagem, corPrincipal) {
		this._exibirComSimbolo(Simbolos.sucesso, mensagem, corPrincipal, false);
	}

	/**
	 * Exibe uma mensagem de erro
	 * @param {string} mensagem - Mensagem a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirErroMensagem(mensagem, corPrincipal) {
		this._exibirComSimbolo(Simbolos.erro, mensagem, corPrincipal, false);
	}

	/**
	 * Exibe uma mensagem de aviso
	 * @param {string} mensagem - Mensagem a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirAviso(mensagem, corPrincipal) {
		this._exibirComSimbolo(Simbolos.aviso, mensagem, corPrincipal, false);
	}

	/**
	 * Exibe texto colorido (com suporte a rainbow)
	 * @param {string} texto - Texto a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 * @param {boolean} comPadding - Se deve adicionar padding (padrão: true)
	 * @returns {string} - Texto formatado
	 */
	static textoColorido(texto, corPrincipal, comPadding = true) {
		const padding = comPadding ? CONSTANTS.UI.PADDING : '';
		const reset = Cores.reset;

		if (corPrincipal === CONSTANTS.COLORS.RAINBOW) {
			return `${padding}${textoRainbow(texto)}`;
		} else {
			return `${padding}${corPrincipal}${texto}${reset}`;
		}
	}

	/**
	 * Exibe uma tela completa com cabeçalho e mensagem
	 * @param {string} titulo - Título do cabeçalho
	 * @param {string} mensagem - Mensagem a exibir
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 * @param {boolean} limparTela - Se deve limpar a tela antes (padrão: true)
	 */
	static exibirTela(titulo, mensagem, corPrincipal, limparTela = true) {
		if (limparTela) {
			console.clear();
		}

		this.exibirCabecalho(titulo, corPrincipal);

		if (mensagem) {
			console.log(`\n${CONSTANTS.UI.PADDING}${mensagem}\n`);
		}
	}

	/**
	 * Exibe uma opção de menu formatada
	 * @param {string} numero - Número da opção
	 * @param {string} descricao - Descrição da opção
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirOpcaoMenu(numero, descricao, corPrincipal) {
		const padding = CONSTANTS.UI.PADDING;
		const idFormatado = `[ ${numero} ]`;
		const idColorido = this._aplicarCor(idFormatado, corPrincipal);
		console.log(`${padding}${idColorido} ${descricao}`);
	}

	/**
	 * Exibe múltiplas opções de menu
	 * @param {Array<{id: string, descricao: string}>} opcoes - Array de opções
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirOpcoesMenu(opcoes, corPrincipal) {
		opcoes.forEach(({ id, descricao }) => {
			this.exibirOpcaoMenu(id, descricao, corPrincipal);
		});
	}

	/**
	 * Exibe prompt para input do usuário
	 * @returns {string} - Sempre retorna o prompt padrão
	 */
	static obterPrompt() {
		return CONSTANTS.UI.PROMPT;
	}

	/**
	 * Exibe uma tela de carregamento/progresso
	 * @param {string} titulo - Título do cabeçalho
	 * @param {string} mensagem - Mensagem de status
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirCarregamento(titulo, mensagem, corPrincipal) {
		console.clear();
		this.exibirCabecalho(titulo, corPrincipal);
		this.exibirInfo(mensagem, corPrincipal);
		console.log('');
	}

	/**
	 * Exibe contagem (ex: "5 amigos encontrados!")
	 * @param {number} quantidade - Quantidade
	 * @param {string} item - Nome do item (singular ou plural)
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirContagem(quantidade, item, corPrincipal) {
		const mensagem = `${quantidade} ${item} encontrado${quantidade !== 1 ? 's' : ''}!`;
		const mensagemColorida = this._aplicarCor(mensagem, corPrincipal);
		this._exibirComSimbolo(Simbolos.sucesso, mensagemColorida, corPrincipal, false);
	}

	/**
	 * Exibe linha em branco com padding
	 */
	static exibirLinhaVazia() {
		console.log('');
	}

	/**
	 * Define o título da janela do terminal
	 * @param {string} titulo - Título da janela
	 */
	static definirTituloJanela(titulo) {
		process.title = titulo;
	}

	/**
	 * Limpa a tela do console
	 */
	static limparTela() {
		console.clear();
	}

	/**
	 * Exibe uma pergunta sim/não formatada
	 * @param {string} pergunta - Pergunta a fazer
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirPerguntaSimNao(pergunta, corPrincipal) {
		const padding = CONSTANTS.UI.PADDING;
		const opcoes = this._aplicarCor('[s/n]', corPrincipal === CONSTANTS.COLORS.RAINBOW ? corPrincipal : Cores.verde);
		console.log(`\n${padding}${Simbolos.info} ${pergunta} ${opcoes}\n`);
	}

	/**
	 * Exibe mensagem com texto destacado em parte específica
	 * @param {string} simbolo - Símbolo a exibir
	 * @param {string} prefixo - Texto antes do destaque
	 * @param {string} textoDestaque - Texto a ser destacado
	 * @param {string} sufixo - Texto após o destaque
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirComDestaque(simbolo, prefixo, textoDestaque, sufixo = '', corPrincipal) {
		const padding = CONSTANTS.UI.PADDING;
		const destaqueColorido = this._aplicarCor(textoDestaque, corPrincipal);
		console.log(`${padding}${simbolo} ${prefixo}${destaqueColorido}${sufixo}`);
	}

	/**
	 * Exibe status de validação de token com sucesso
	 * @param {number} indice - Índice da token
	 * @param {string} nomeUsuario - Nome do usuário
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirTokenValida(indice, nomeUsuario, corPrincipal) {
		this.exibirComDestaque(Simbolos.sucesso, `Token ${indice}: `, nomeUsuario, '', corPrincipal);
	}

	/**
	 * Exibe status de token já cadastrada
	 * @param {number} indice - Índice da token
	 * @param {string} nomeUsuario - Nome do usuário
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirTokenJaCadastrada(indice, nomeUsuario, corPrincipal) {
		this.exibirComDestaque(
			Simbolos.aviso,
			`Token ${indice}: `,
			nomeUsuario,
			` ${Cores.amarelo}(já cadastrada)${Cores.reset}`,
			corPrincipal
		);
	}

	/**
	 * Exibe status de token duplicada no sistema
	 * @param {number} indice - Índice da token
	 * @param {string} nomeUsuario - Nome do usuário
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirTokenDuplicada(indice, nomeUsuario, corPrincipal) {
		this.exibirComDestaque(
			Simbolos.aviso,
			`Token ${indice}: `,
			nomeUsuario,
			` ${Cores.amarelo}(duplicada no sistema)${Cores.reset}`,
			corPrincipal
		);
	}

	/**
	 * Exibe status de token inválida
	 * @param {number} indice - Índice da token
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirTokenInvalida(indice, corPrincipal) {
		const padding = CONSTANTS.UI.PADDING;
		console.log(`${padding}${Simbolos.erro} Token ${indice}: ${Cores.vermelho}Inválida${Cores.reset}`);
	}

	/**
	 * Exibe mensagem de token adicionada com sucesso
	 * @param {string} nomeUsuario - Nome do usuário
	 * @param {string} textoAdicional - Texto adicional (opcional)
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirTokenAdicionada(nomeUsuario, textoAdicional, corPrincipal) {
		const sufixo = textoAdicional ? ` ${textoAdicional}` : ' adicionada com sucesso!';
		this.exibirComDestaque(Simbolos.sucesso, '', nomeUsuario, sufixo, corPrincipal);
	}

	/**
	 * Exibe mensagem "Conectado como [usuário]" com destaque
	 * @param {string} nomeUsuario - Nome do usuário
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirConectadoComo(nomeUsuario, corPrincipal) {
		this.exibirComDestaque(Simbolos.sucesso, 'Conectado como ', nomeUsuario, '', corPrincipal);
	}

	/**
	 * Exibe instrução para pressionar ENTER com destaque
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirInstrucaoPressionarEnter(corPrincipal) {
		const padding = CONSTANTS.UI.PADDING;
		const enterColorido = this._aplicarCor('ENTER', corPrincipal);
		console.log(
			`\n${padding}${Simbolos.aviso} Pressione ${enterColorido} quando terminar de configurar para voltar ao menu`
		);
	}

	/**
	 * Exibe exemplo de seleção de tokens
	 * @param {string} corPrincipal - Cor principal ou 'rainbow'
	 */
	static exibirExemploSelecaoTokens(corPrincipal) {
		const padding = CONSTANTS.UI.PADDING;
		const exemplo1 = this._aplicarCor('1 2', corPrincipal);
		const exemplo2 = this._aplicarCor('todas', corPrincipal);
		console.log(`${padding}${Simbolos.info} Ex: ${exemplo1} ou digite ${exemplo2} para adicionar tudo`);
	}
}

module.exports = UIComponents;
