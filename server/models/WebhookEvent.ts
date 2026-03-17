type AttemptStatus = "success" | "failure";
type EventStatus = "pending" | "processed" | "failed";
type Destination = {
  type: "http" | "slack" | "email";
  url?: string;
};

type Origin = {
  type: string;
  url?: string;
};
/*Think about the complete flow we described.
A Stripe webhook arrives notifying you of a payment.
Your system receives it, queues it, processes it, and delivers it to Slack.
In that journey, your system needs to store information about that event.

For example,
how do you know if that event has already been processed or is still pending?
How do you know where it came from?
How do you know where to send it? */
export type WebhookEvent = {
  eventId: string;
  tenantId: string;
  eventType: string;
  status: EventStatus;
  origin: Origin;
  data: unknown;
  createdAt: Date;
};

/*Route — is the rule that defines what to do with an event.
What information does it need?*/
export type Route = {
  eventType: string;
  destination: Destination;
  tenantId: string;
};

/*DeliveryAttempt — is the record of a delivery attempt.
What do you need to know about each attempt?*/
export type DeliveryAttempt = {
  eventId: string;
  destination: Destination;
  status: AttemptStatus;
  timestamp: Date;
  errorMessage?: string;
};
