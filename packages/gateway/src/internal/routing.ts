import {
  testValue,
  type ACPConfig,
  type CanonicalAction,
  type Match,
  type Principal,
  type RequestContext,
  type RouteAction,
  type RouteRule,
} from "@acp/core";

function needsNormalization(match: Match): boolean {
  return Boolean(match.tool || match.action || match.resource);
}

export function matchRule(rule: RouteRule, candidate: {
  channel: string;
  method: string;
  host: string;
  path: string;
  tool?: string;
  action?: string;
  resource?: string;
  agentId?: string;
  env?: string;
}): boolean {
  const m = rule.match;
  return (
    testValue(m.channel, candidate.channel) &&
    testValue(m.method, candidate.method) &&
    testValue(m.host, candidate.host) &&
    testValue(m.path, candidate.path) &&
    testValue(m.tool, candidate.tool) &&
    testValue(m.action, candidate.action) &&
    testValue(m.resource, candidate.resource) &&
    testValue(m.agentId, candidate.agentId) &&
    testValue(m.env, candidate.env)
  );
}

export function pickRouteAction(
  config: ACPConfig,
  raw: RequestContext,
  principal: Principal,
  target: CanonicalAction["target"],
): RouteAction {
  const simpleCandidate = {
    channel: raw.channel,
    method: raw.method,
    host: raw.host,
    path: raw.path,
    agentId: principal.agentId,
    env: principal.env,
  };

  for (const rule of config.routing.rules) {
    if (needsNormalization(rule.match)) {
      continue;
    }
    if (matchRule(rule, simpleCandidate)) {
      return rule.action;
    }
  }

  const fullCandidate = { ...simpleCandidate, ...target };
  for (const rule of config.routing.rules) {
    if (matchRule(rule, fullCandidate)) {
      return rule.action;
    }
  }

  return config.routing.defaultAction;
}
