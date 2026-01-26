const readline = require('readline');

/**
 * Readline assíncrono que usa uma única instância persistente
 */
class ReadlineAsync {
    constructor() {
        this.rl = null;
        this.currentResolve = null;
        this.currentPrompt = null;
        this.isActive = false;
    }

    /**
     * Inicializa o readline (chamado uma vez)
     */
    init() {
        if (this.rl) return;
        
        if (process.stdin.isPaused()) {
            process.stdin.resume();
        }
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false 
        });
        
        this.rl.on('line', (line) => {
            if (this.currentResolve) {
                const resolver = this.currentResolve;
                this.currentResolve = null;
                this.currentPrompt = null;
                this.isActive = false;
                resolver(line.trim());
            }
        });
        
        this.rl.on('close', () => {
            this.rl = null;
        });
    }

    /**
     * Garante que o readline está inicializado
     */
    ensureInit() {
        if (!this.rl) {
            this.init();
        }
    }

    /**
     * Faz uma pergunta e aguarda resposta de forma assíncrona
     * @param {string} prompt - O prompt a exibir
     * @returns {Promise<string>} A resposta do usuário
     */
    async question(prompt) {
        this.ensureInit();
        
        if (this.currentResolve) {
            const oldResolver = this.currentResolve;
            this.currentResolve = null;
            this.currentPrompt = null;
            this.isActive = false;
            oldResolver('__CANCELLED__');
        }
        
        if (process.stdin.isRaw) {
            process.stdin.setRawMode(false);
        }
        if (process.stdin.isPaused()) {
            process.stdin.resume();
        }
        
        if (global.registrarInicioReadline) {
            global.registrarInicioReadline();
        }
        
        return new Promise((resolve) => {
            this.currentResolve = resolve;
            this.currentPrompt = prompt;
            this.isActive = true;
            
            process.stdout.write(prompt);
        });
    }

    /**
     * Cancela a pergunta atual
     */
    cancel() {
        if (this.currentResolve) {
            const resolver = this.currentResolve;
            this.currentResolve = null;
            this.currentPrompt = null;
            this.isActive = false;
            
            if (this.rl) {
                process.stdout.write('\r\x1b[K');
            }
            
            resolver('__CANCELLED__');
        }
    }

    /**
     * Obtém o prompt atual
     */
    getCurrentPrompt() {
        return this.currentPrompt;
    }

    /**
     * Verifica se está aguardando input
     */
    isWaiting() {
        return this.currentResolve !== null && this.isActive;
    }

    /**
     * Fecha a interface readline (não deve ser usado normalmente)
     */
    close() {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
        this.currentResolve = null;
        this.currentPrompt = null;
        this.isActive = false;
    }
    
    /**
     * Reinicia a interface readline
     */
    async reset() {
        if (this.currentResolve) {
            this.cancel();
        }
    }

    /**
     * Pausa e aguarda tecla (similar ao keyInPause)
     * @param {string} message - Mensagem opcional
     */
    async keyInPause(message = '') {
        if (message) {
            process.stdout.write(message);
        }
        
        return new Promise((resolve) => {
            const wasRaw = process.stdin.isRaw;
            process.stdin.setRawMode(true);
            process.stdin.resume();
            
            const onData = () => {
                process.stdin.setRawMode(wasRaw);
                process.stdin.removeListener('data', onData);
                resolve();
            };
            
            process.stdin.once('data', onData);
        });
    }
}

const readlineAsync = new ReadlineAsync();

module.exports = { ReadlineAsync, readlineAsync };
