import { ASTVisitor, FragmentDefinitionNode, GraphQLError, Kind, SelectionSetNode, ValidationContext } from 'graphql';

// Правило валидации GraphQL: ограничивает вложенность и общее число полей запроса.
// Проверяется до выполнения, поэтому слишком "тяжелый" запрос не доходит до базы.
// Служебные поля интроспекции (__schema, __type) не учитываются
export function queryLimits({ maxDepth, maxFields }: { maxDepth: number; maxFields: number }) {
  return (context: ValidationContext): ASTVisitor => {
    const fragments = new Map<string, FragmentDefinitionNode>();
    for (const def of context.getDocument().definitions) {
      if (def.kind === Kind.FRAGMENT_DEFINITION) fragments.set(def.name.value, def);
    }

    let fields = 0;
    const depthOf = (set: SelectionSetNode | undefined, depth: number, seen: Set<string>): number => {
      if (!set) return depth;
      let max = depth;
      for (const sel of set.selections) {
        if (sel.kind === Kind.FIELD) {
          if (sel.name.value.startsWith('__')) continue;
          fields += 1;
          max = Math.max(max, depthOf(sel.selectionSet, depth + 1, seen));
        } else if (sel.kind === Kind.INLINE_FRAGMENT) {
          max = Math.max(max, depthOf(sel.selectionSet, depth, seen));
        } else if (sel.kind === Kind.FRAGMENT_SPREAD && !seen.has(sel.name.value)) {
          const fragment = fragments.get(sel.name.value);
          if (fragment) max = Math.max(max, depthOf(fragment.selectionSet, depth, new Set([...seen, sel.name.value])));
        }
      }
      return max;
    };

    return {
      OperationDefinition(node) {
        fields = 0;
        const depth = depthOf(node.selectionSet, 0, new Set());
        if (depth > maxDepth) {
          context.reportError(
            new GraphQLError(`Слишком глубокий запрос: ${depth} уровней, допустимо ${maxDepth}`, {
              extensions: { code: 'QUERY_TOO_DEEP' },
            }),
          );
        }
        if (fields > maxFields) {
          context.reportError(
            new GraphQLError(`Слишком большой запрос: ${fields} полей, допустимо ${maxFields}`, {
              extensions: { code: 'QUERY_TOO_LARGE' },
            }),
          );
        }
      },
    };
  };
}
