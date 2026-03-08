import _ from 'lodash';

export type VariableChange = {
  path: string;
  before: any;
  after: any;
  kind: 'added' | 'removed' | 'changed';
};

const isPrimitive = (value: any) => value === null || typeof value !== 'object';
const isPlainObject = (value: any) => Object.prototype.toString.call(value) === '[object Object]';

const joinPath = (base: string, next: string) => (base ? `${base}.${next}` : next);
const indexPath = (base: string, index: number) => `${base}[${index}]`;

export function diffVariables(prev: any, next: any, basePath = ''): VariableChange[] {
  const changes: VariableChange[] = [];

  if (!_.isEqual(prev, next)) {
    const prevIsPrimitive = isPrimitive(prev);
    const nextIsPrimitive = isPrimitive(next);

    if (prevIsPrimitive || nextIsPrimitive) {
      changes.push({
        path: basePath || '$root',
        before: prev,
        after: next,
        kind: prev === undefined ? 'added' : next === undefined ? 'removed' : 'changed'
      });
      return changes;
    }

    const prevIsArray = Array.isArray(prev);
    const nextIsArray = Array.isArray(next);
    if (prevIsArray || nextIsArray) {
      if (!(prevIsArray && nextIsArray)) {
        changes.push({
          path: basePath || '$root',
          before: prev,
          after: next,
          kind: prev === undefined ? 'added' : next === undefined ? 'removed' : 'changed'
        });
        return changes;
      }

      const maxLength = Math.max(prev.length, next.length);
      for (let i = 0; i < maxLength; i += 1) {
        if (i >= prev.length) {
          changes.push({
            path: indexPath(basePath || '$root', i),
            before: undefined,
            after: next[i],
            kind: 'added'
          });
        } else if (i >= next.length) {
          changes.push({
            path: indexPath(basePath || '$root', i),
            before: prev[i],
            after: undefined,
            kind: 'removed'
          });
        } else {
          changes.push(...diffVariables(prev[i], next[i], indexPath(basePath || '$root', i)));
        }
      }

      return changes;
    }

    const prevIsObj = isPlainObject(prev);
    const nextIsObj = isPlainObject(next);
    if (!(prevIsObj && nextIsObj)) {
      changes.push({
        path: basePath || '$root',
        before: prev,
        after: next,
        kind: 'changed'
      });
      return changes;
    }

    const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
    keys.forEach((key) => {
      if (!(key in prev)) {
        changes.push({
          path: joinPath(basePath, key),
          before: undefined,
          after: next[key],
          kind: 'added'
        });
        return;
      }
      if (!(key in next)) {
        changes.push({
          path: joinPath(basePath, key),
          before: prev[key],
          after: undefined,
          kind: 'removed'
        });
        return;
      }

      changes.push(...diffVariables(prev[key], next[key], joinPath(basePath, key)));
    });
  }

  return changes;
}

export function groupChangesByModule(
  changes: VariableChange[],
  moduleOrder: string[]
): Record<string, VariableChange[]> {
  const grouped: Record<string, VariableChange[]> = {};

  changes.forEach((change) => {
    const match = change.path.match(/^[^.[\]]+/);
    const moduleName = match ? match[0] : '其他';
    if (!grouped[moduleName]) grouped[moduleName] = [];
    grouped[moduleName].push(change);
  });

  const ordered: Record<string, VariableChange[]> = {};
  moduleOrder.forEach((name) => {
    if (grouped[name]) {
      ordered[name] = grouped[name];
    }
  });
  Object.keys(grouped).forEach((name) => {
    if (!ordered[name]) ordered[name] = grouped[name];
  });

  return ordered;
}
