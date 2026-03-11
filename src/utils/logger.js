const LOG_LEVELS = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR'
};

const serializeMeta = (meta = {}) => {
  const cleaned = Object.entries(meta).reduce((acc, [key, value]) => {
    if (value instanceof Error) {
      acc[key] = {
        message: value.message,
        stack: value.stack,
        name: value.name
      };
      return acc;
    }

    if (value !== undefined) {
      acc[key] = value;
    }

    return acc;
  }, {});

  return Object.keys(cleaned).length > 0 ? ` ${JSON.stringify(cleaned)}` : '';
};

const writeLog = (level, message, meta) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${LOG_LEVELS[level]}] ${message}${serializeMeta(meta)}`;
  const method = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  method(line);
};

const logger = {
  info(message, meta) {
    writeLog('info', message, meta);
  },
  warn(message, meta) {
    writeLog('warn', message, meta);
  },
  error(message, meta) {
    writeLog('error', message, meta);
  }
};

export default logger;
