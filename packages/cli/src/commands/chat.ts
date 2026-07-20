import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const API_URL = process.env.VESTARA_API_URL || 'http://localhost:3000';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ChatCommand {
  private messages: ChatMessage[] = [];

  async execute(options: { model?: string; provider?: string }): Promise<void> {
    console.log(chalk.bold.cyan('\n  Vestara AI Chat\n'));
    console.log(chalk.gray('  Type your message and press Enter.'));
    console.log(chalk.gray('  Commands: /quit, /clear, /model <model>\n'));

    const model = options.model || 'opencode/deepseek-v4-flash-free';
    const provider = options.provider || 'opencode';

    await this.chatLoop(model, provider);
  }

  private async chatLoop(model: string, provider: string): Promise<void> {
    while (true) {
      const { message } = await inquirer.prompt([
        {
          type: 'input',
          name: 'message',
          message: chalk.cyan('You:'),
        },
      ]);

      if (message === '/quit') {
        console.log(chalk.gray('\n  Goodbye!\n'));
        break;
      }

      if (message === '/clear') {
        this.messages = [];
        console.log(chalk.gray('\n  Chat cleared.\n'));
        continue;
      }

      if (message.startsWith('/model')) {
        const newModel = message.split(' ')[1];
        if (newModel) {
          model = newModel;
          console.log(chalk.gray(`\n  Model set to: ${model}\n`));
        }
        continue;
      }

      this.messages.push({ role: 'user', content: message });

      const spinner = ora('Thinking...').start();

      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: this.messages,
            model,
            provider,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json() as { content: string };
        spinner.stop();

        console.log(chalk.green(`\nAssistant: ${data.content}\n`));
        this.messages.push({ role: 'assistant', content: data.content });
      } catch (error) {
        spinner.fail(chalk.red('Failed to get response'));
        console.log(chalk.gray('\n  Is the API running? Try: vestara start\n'));
      }
    }
  }
}
