I need to look at the actual Discord.js source at the crash line. I've been guessing instead of reading the code.

MessagePayload.js#L1-345
Found it. Line 188-190:

js
if (typeof this.options.reply === 'object') {
  const reference = this.options.reply.messageReference;
  const message_id = this.isMessage ? (reference.id ?? reference) : this.target.messages.resolveId(reference);
Discord.js checks if this.options.reply is an object. Our Object.assign puts a reply property on the payload, and Discord.js interprets it as a "reply to message" directive. Then it tries to call this.target.messages.resolveId() on the InteractionWebhook, which doesn't have a .messages property → crash.

The fix is dead simple: stop putting reply and send on the payload object.

