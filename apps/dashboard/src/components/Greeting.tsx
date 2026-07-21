import { useAuth } from '../contexts/AuthContext';

const quotes = [
  'Ready to build something great.',
  'Your AI workstation is online.',
  'Let\'s make progress today.',
  'Systems nominal. Creativity flowing.',
  'All AI systems are go.',
];

export function Greeting() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const quote = quotes[Math.abs(Math.floor(Math.random() * quotes.length))];

  return (
    <div>
      <h1 className="text-2xl font-bold text-vestara-text">
        {timeGreeting}{user ? `, ${user.name}` : ''}
      </h1>
      <p className="text-sm text-vestara-text-muted">{quote}</p>
    </div>
  );
}
