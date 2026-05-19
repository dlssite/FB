import { Logger } from '../../../utils/logger';

export class FunService {
  /**
   * Fetches a random fact.
   */
  static async getFact(): Promise<string> {
    try {
      const response = await fetch('https://uselessfacts.jsph.pl/random.json?language=en');
      const data = await response.json();
      return data.text;
    } catch (err) {
      Logger.error('[FUN] Failed to fetch fact', err);
      return 'The human brain contains about 86 billion neurons.'; // Fallback
    }
  }

  /**
   * Fetches a random joke.
   */
  static async getJoke(): Promise<string> {
    try {
      const response = await fetch('https://v2.jokeapi.dev/joke/Any?blacklistFlags=nsfw,racist,sexist&type=single');
      const data = await response.json();
      
      if (data.type === 'single') {
        return data.joke;
      } else if (data.type === 'twopart') {
        return `${data.setup}\n\n||${data.delivery}||`; // Discord spoiler
      }
      return 'Why do programmers prefer dark mode? Because light attracts bugs!';
    } catch (err) {
      Logger.error('[FUN] Failed to fetch joke', err);
      return 'Why do programmers prefer dark mode? Because light attracts bugs!';
    }
  }

  /**
   * Fetches a random riddle.
   */
  static async getRiddle(): Promise<{ question: string; answer: string }> {
    try {
      const response = await fetch('https://riddles-api.vercel.app/random');
      const data = await response.json();
      return { question: data.riddle, answer: data.answer };
    } catch (err) {
      Logger.error('[FUN] Failed to fetch riddle', err);
      return {
        question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
        answer: "An echo"
      };
    }
  }

  /**
   * Fetches a random meme from Reddit.
   */
  static async getMeme(): Promise<{ title: string; url: string; postLink: string }> {
    try {
      const response = await fetch('https://meme-api.com/gimme');
      const data = await response.json();
      return {
        title: data.title,
        url: data.url,
        postLink: data.postLink
      };
    } catch (err) {
      Logger.error('[FUN] Failed to fetch meme', err);
      return {
        title: 'Meme fetch failed',
        url: 'https://i.imgflip.com/1g8my4.jpg', // "This is fine" fallback
        postLink: '#'
      };
    }
  }

  /**
   * Fetches a random trivia question.
   */
  static async getTrivia(): Promise<{ question: string; correctAnswer: string; options: string[]; difficulty: string; category: string }> {
    try {
      const response = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        const item = data.results[0];
        const options = [...item.incorrect_answers, item.correct_answer].sort(() => Math.random() - 0.5);
        return {
          question: item.question,
          correctAnswer: item.correct_answer,
          options,
          difficulty: item.difficulty,
          category: item.category
        };
      }
      throw new Error('No results');
    } catch (err) {
      Logger.error('[FUN] Failed to fetch trivia', err);
      return {
        question: "What is the capital of France?",
        correctAnswer: "Paris",
        options: ["London", "Berlin", "Paris", "Madrid"],
        difficulty: "easy",
        category: "Geography"
      };
    }
  }

  /**
   * Generates a dynamic roast.
   */
  static async getRoast(username: string): Promise<string> {
    const roasts = [
      `{user}, you're like a cloud. When you disappear, it's a beautiful day.`,
      `{user}, I'd agree with you, but then we'd both be wrong.`,
      `I'm not saying {user} is stupid, but they'd struggle to pour water out of a boot with the instructions on the heel.`,
      `{user}, you bring everyone so much joy... when you leave the room.`,
      `If laughter is the best medicine, {user}'s face must be curing the world.`,
      `{user}, you're the reason the gene pool needs a lifeguard.`,
      `Some day {user} will go far. And I hope they stay there.`
    ];
    const random = roasts[Math.floor(Math.random() * roasts.length)];
    return random.replace('{user}', `<@${username}>`);
  }

  /**
   * Evaluates a math expression safely.
   */
  static evaluateMath(expression: string): string {
    try {
      // Very basic safe evaluation using Function, restricting to math.
      // Do not allow letters except Math functions
      if (/[a-zA-Z]/.test(expression.replace(/Math|sqrt|pow|sin|cos|tan|log|pi/g, ''))) {
        return 'Invalid Expression (Letters not allowed)';
      }
      
      const safeExpr = expression
        .replace(/sqrt/g, 'Math.sqrt')
        .replace(/pow/g, 'Math.pow')
        .replace(/sin/g, 'Math.sin')
        .replace(/cos/g, 'Math.cos')
        .replace(/tan/g, 'Math.tan')
        .replace(/log/g, 'Math.log')
        .replace(/pi/g, 'Math.PI');

      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${safeExpr}`)();
      if (typeof result === 'number' && !isNaN(result)) {
        return result.toString();
      }
      return 'Math Error';
    } catch (err) {
      return 'Invalid Expression';
    }
  }
}
