export class CaptchaService {
  /**
   * Generates a random math question
   */
  static generateMathCaptcha() {
    const a = Math.floor(Math.random() * 20) + 1;
    const b = Math.floor(Math.random() * 20) + 1;
    return {
      question: `What is ${a} + ${b}?`,
      answer: (a + b).toString(),
    };
  }

  /**
   * Generates a random color selection question
   */
  static generateColorCaptcha() {
    const colors = [
      { name: 'Red', emoji: '🔴', value: 'red' },
      { name: 'Blue', emoji: '🔵', value: 'blue' },
      { name: 'Green', emoji: '🟢', value: 'green' },
      { name: 'Yellow', emoji: '🟡', value: 'yellow' },
      { name: 'Purple', emoji: '🟣', value: 'purple' },
    ];
    
    // Shuffle
    const shuffled = colors.sort(() => Math.random() - 0.5);
    const target = shuffled[Math.floor(Math.random() * shuffled.length)];

    return {
      question: `Click the ${target.name} button below.`,
      options: shuffled,
      answer: target.value,
    };
  }
}
