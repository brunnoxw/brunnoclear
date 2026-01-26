const { atualizarPresenca } = require('../services/rpc');
const EventEmitter = require('events');

/**
 * Gerenciador de tarefas em segundo plano
 */
class BackgroundTaskManager extends EventEmitter {
	constructor() {
		super();
		this.tasks = new Map();
		this.taskIdCounter = 0;
	}

	/**
	 * Adiciona uma nova tarefa em segundo plano
	 * @param {string} name - Nome da tarefa
	 * @param {Function} stopCallback - Função para parar a tarefa
	 * @param {Object} data - Dados adicionais da tarefa
	 * @returns {number} ID da tarefa
	 */
	addTask(name, stopCallback, data = {}) {
		const taskId = ++this.taskIdCounter;
		this.tasks.set(taskId, {
			id: taskId,
			name,
			stopCallback,
			data,
			startedAt: Date.now()
		});
		this.emit('taskAdded', taskId);
		return taskId;
	}

	/**
	 * Remove uma tarefa
	 * @param {number} taskId - ID da tarefa
	 */
	async removeTask(taskId) {
		const task = this.tasks.get(taskId);
		if (task && task.stopCallback) {
			await task.stopCallback();
		}
		this.tasks.delete(taskId);
		this.emit('taskRemoved', taskId);
	}

	/**
	 * Remove todas as tarefas
	 */
	async removeAllTasks() {
		for (const [taskId, task] of this.tasks) {
			if (task.stopCallback) {
				await task.stopCallback();
			}
		}
		this.tasks.clear();
		this.emit('allTasksRemoved');
	}

	/**
	 * Obtém todas as tarefas ativas
	 * @returns {Array} Lista de tarefas
	 */
	getTasks() {
		return Array.from(this.tasks.values());
	}

	/**
	 * Verifica se há tarefas ativas
	 * @returns {boolean}
	 */
	hasTasks() {
		return this.tasks.size > 0;
	}

	/**
	 * Obtém uma tarefa específica
	 * @param {number} taskId - ID da tarefa
	 * @returns {Object|undefined}
	 */
	getTask(taskId) {
		return this.tasks.get(taskId);
	}

	/**
	 * Atualiza dados de uma tarefa
	 * @param {number} taskId - ID da tarefa
	 * @param {Object} newData - Novos dados
	 */
	updateTaskData(taskId, newData) {
		const task = this.tasks.get(taskId);
		if (task) {
			task.data = { ...task.data, ...newData };
		}
	}
}

const backgroundTaskManager = new BackgroundTaskManager();

module.exports = {
	BackgroundTaskManager,
	backgroundTaskManager
};
