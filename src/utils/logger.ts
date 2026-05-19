import chalk from 'chalk';

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARN = 'WARN',
  ERROR = 'ERROR',
  LOADER = 'LOADER',
  TENANT = 'TENANT',
  DATABASE = 'PRISMA'
}

export class Logger {
  private static getTimestamp() {
    const now = new Date();
    return chalk.gray(`[${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}]`);
  }

  static info(message: string, category = LogLevel.INFO) {
    console.log(`${this.getTimestamp()} ${chalk.blue(`[${category}]`)} ${message}`);
  }

  static success(message: string) {
    console.log(`${this.getTimestamp()} ${chalk.green(`[${LogLevel.SUCCESS}]`)} ${message}`);
  }

  static warn(message: string) {
    console.log(`${this.getTimestamp()} ${chalk.yellow(`[${LogLevel.WARN}]`)} ${message}`);
  }

  static error(message: string, error?: any) {
    console.log(`${this.getTimestamp()} ${chalk.red(`[${LogLevel.ERROR}]`)} ${message}`);
    if (error) {
      if (error.stack) {
        console.log(chalk.red(error.stack));
      } else {
        console.log(chalk.red(JSON.stringify(error, null, 2)));
      }
    }
  }

  static loader(message: string) {
    console.log(`${this.getTimestamp()} ${chalk.magenta(`[${LogLevel.LOADER}]`)} ${message}`);
  }

  static tenant(tenantId: string, message: string) {
    console.log(`${this.getTimestamp()} ${chalk.cyan(`[TENANT:${tenantId.toUpperCase()}]`)} ${message}`);
  }

  static debug(message: string, category: any = 'DEBUG') {
    // Only show debug logs if a DEBUG environment variable or flag is set if you want, 
    // but for now we'll just enable it.
    console.log(`${this.getTimestamp()} ${chalk.gray(`[${category}]`)} ${message}`);
  }

  static prisma(message: string) {
    console.log(`${this.getTimestamp()} ${chalk.cyanBright(`[${LogLevel.DATABASE}]`)} ${message}`);
  }
}
