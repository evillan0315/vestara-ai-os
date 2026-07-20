import chalk from 'chalk';
import ora from 'ora';

const API_URL = process.env.VESTARA_API_URL || 'http://localhost:3000';

interface Model {
  id: string;
  name: string;
  provider: string;
  available: boolean;
}

export class ModelsCommand {
  async execute(options: { provider?: string }): Promise<void> {
    const spinner = ora('Fetching models...').start();

    try {
      const response = await fetch(`${API_URL}/api/providers/models`);
      const data = await response.json() as { models: Model[] };

      spinner.stop();

      const models = options.provider
        ? data.models.filter(m => m.provider === options.provider)
        : data.models;

      console.log(chalk.bold.cyan('\n  Available AI Models\n'));

      if (models.length === 0) {
        console.log(chalk.gray('  No models available'));
        return;
      }

      // Group by provider
      const byProvider = models.reduce((acc, model) => {
        if (!acc[model.provider]) acc[model.provider] = [];
        acc[model.provider].push(model);
        return acc;
      }, {} as Record<string, Model[]>);

      for (const [provider, providerModels] of Object.entries(byProvider)) {
        console.log(chalk.bold.white(`  ${provider}`));
        for (const model of providerModels) {
          const status = model.available ? chalk.green('●') : chalk.red('○');
          console.log(`    ${status} ${model.name || model.id}`);
        }
        console.log('');
      }
    } catch (error) {
      spinner.fail(chalk.red('Failed to fetch models'));
      console.log(chalk.gray('\n  Is the API running? Try: vestara start\n'));
      process.exit(1);
    }
  }
}
