/**
 * MessageQueue - Gerenciador de fila de mensagens para evitar spam e limites de taxa
 * Refatorado para usar um Worker Pool assíncrono e evitar travamentos de Head-of-Line Blocking.
 */
class MessageQueue {
    constructor(maxWorkers = 4, batchSize = 10, messagesPerBatch = 2) {
        this.queue = [];
        this.maxWorkers = maxWorkers;
        this.batchSize = batchSize;
        this.messagesPerBatch = messagesPerBatch;
        this.activeWorkers = 0;
        this.isProcessing = false;
        this.errorHandler = null;
        // Serialização por chat: mensagens do mesmo chat (grupo/PV) são
        // processadas em ordem, uma por vez. Sem isso, dois comandos do
        // mesmo grupo rodavam em paralelo (worker pool) e o save mais
        // recente de groupData sobrescrevia as mutações do outro.
        this.chatLocks = new Map();
        this.stats = {
            totalProcessed: 0,
            totalErrors: 0,
            currentQueueLength: 0,
            startTime: Date.now(),
            batchesProcessed: 0,
            avgBatchTime: 0
        };
        this.idCounter = 0;
    }

    setErrorHandler(handler) {
        this.errorHandler = handler;
    }

    async add(message, processor) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                message,
                processor,
                resolve,
                reject,
                timestamp: Date.now(),
                id: `msg_${++this.idCounter}_${Date.now()}`
            });
            
            this.stats.currentQueueLength = this.queue.length;
            
            if (this.activeWorkers < this.maxWorkers) {
                this.startProcessing();
            }
        });
    }

    startProcessing() {
        this.isProcessing = true;
        this.processQueue();
    }

    stopProcessing() {
        this.isProcessing = false;
    }

    resume() {
        this.startProcessing();
    }

    processQueue() {
        while (this.isProcessing && this.activeWorkers < this.maxWorkers && this.queue.length > 0) {
            this.activeWorkers++;
            this.runWorker();
        }
    }

    async runWorker() {
        while (this.isProcessing && this.queue.length > 0) {
            const item = this.queue.shift();
            this.stats.currentQueueLength = this.queue.length;
            if (!item) continue;

            const startTime = Date.now();
            try {
                await this.processItem(item);
                this.stats.totalProcessed++;
            } catch (error) {
                this.stats.totalErrors++;
            } finally {
                const duration = Date.now() - startTime;
                this.stats.batchesProcessed++;
                this.stats.avgBatchTime = 
                    (this.stats.avgBatchTime * (this.stats.batchesProcessed - 1) + duration) / 
                    this.stats.batchesProcessed;
            }
        }
        this.activeWorkers--;
    }

    /**
     * Executa fn em série para o chat indicado (encadeia na promise anterior).
     * A entrada se auto-remove do Map quando a cadeia assenta e ninguém
     * encadeou mais nada em cima dela.
     */
    _runSerialized(chatKey, fn) {
        const previous = this.chatLocks.get(chatKey) ?? Promise.resolve();
        const run = previous.then(fn, fn);
        const next = run.then(() => {}, () => {});
        next.then(() => {
            if (this.chatLocks.get(chatKey) === next) this.chatLocks.delete(chatKey);
        });
        this.chatLocks.set(chatKey, next);
        return run;
    }

    async processItem(item) {
        const { message, processor, resolve, reject } = item;
        const chatKey = message?.key?.remoteJid || null;
        try {
            const result = chatKey
                ? await this._runSerialized(chatKey, () => processor(message))
                : await processor(message);
            resolve(result);
            return result;
        } catch (error) {
            await this.handleProcessingError(item, error);
            reject(error);
            throw error;
        }
    }

    async handleProcessingError(item, error) {
        console.error(`❌ Queue processing error for message ${item.id}:`, error.message);
        
        if (this.errorHandler) {
            try {
                await this.errorHandler(item, error);
            } catch (handlerError) {
                console.error('❌ Error handler failed:', handlerError.message);
            }
        }
    }

    async shutdown() {
        this.stopProcessing();
        await new Promise(resolve => setTimeout(resolve, 500));
        return true;
    }

    getStatus() {
        const uptime = Date.now() - this.stats.startTime;
        return {
            queueLength: this.queue.length,
            batchSize: this.batchSize,
            messagesPerBatch: this.messagesPerBatch,
            isProcessing: this.isProcessing,
            activeWorkers: this.activeWorkers,
            maxWorkers: this.maxWorkers,
            totalProcessed: this.stats.totalProcessed,
            totalErrors: this.stats.totalErrors,
            avgBatchTime: Math.round(this.stats.avgBatchTime),
            uptime: uptime,
            throughput: this.stats.totalProcessed > 0 ?
                (this.stats.totalProcessed / (uptime / 1000)).toFixed(2) : 0,
            errorRate: this.stats.totalProcessed > 0 ?
                ((this.stats.totalErrors / this.stats.totalProcessed) * 100).toFixed(2) : 0
        };
    }
}

export default MessageQueue;
