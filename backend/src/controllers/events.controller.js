export async function streamEvents(req, res, next) {
  try {
    const eventBus = req.app.locals.eventBus;
    const channel = req.query.channel;

    if (!eventBus) {
      return res.status(503).json({ message: "Realtime event bus is not configured." });
    }

    if (!channel) {
      return res.status(400).json({ message: "channel query parameter is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const unsubscribe = eventBus.subscribe(channel, (event) => {
      res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    });

    req.on("close", () => {
      unsubscribe();
      res.end();
    });
  } catch (error) {
    next(error);
  }
}
