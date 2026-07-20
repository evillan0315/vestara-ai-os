import chalk from 'chalk';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CONFIG_FILE = 'vestara.config.json';
const DEFAULT_CONFIG = {
  apiUrl: 'http://localhost:3000',
  defaultProvider: 'opencode',
  defaultModel: 'opencode/deepseek-v4-flash-free',
  theme: 'dark',
};

export class ConfigCommand {
  private getConfigPath(): string {
    return join(process.env.HOME || '.', '.vestara', CONFIG_FILE);
  }

  private loadConfig(): Record<string, unknown> {
    const configPath = this.getConfigPath();
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
    return { ...DEFAULT_CONFIG };
  }

  private saveConfig(config: Record<string, unknown>): void {
    const configPath = this.getConfigPath();
    const dir = require('path').dirname(configPath);
    if (!existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  async execute(options: { get?: string; set?: string; list?: boolean }): Promise<void> {
    const config = this.loadConfig();

    if (options.get) {
      const value = config[options.get];
      if (value === undefined) {
        console.log(chalk.red(`Config key "${options.get}" not found`));
        process.exit(1);
      }
      console.log(value);
      return;
    }

    if (options.set) {
      const [key, ...valueParts] = options.set.split(' ');
      const value = valueParts.join(' ');
      config[key] = value;
      this.saveConfig(config);
      console.log(chalk.green(`Set ${key} = ${value}`));
      return;
    }

    // Default: list all config
    console.log(chalk.bold.cyan('\n  Vestara Configuration\n'));
    for (const [key, value] of Object.entries(config)) {
      console.log(chalk.white(`  ${key.padEnd(20)}`) + chalk.yellow(`${value}`));
    }
    console.log('');
  }
}
