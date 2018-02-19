import { groupBy } from 'lodash';
import { decamelize } from 'humps';
import settings from '../../../../settings';

export const truncateTables = async (knex, Promise, tables) => {
  if (settings.db.dbType === 'sqlite' || process.env.NODE_ENV === 'test') {
    return Promise.all(tables.map(table => knex(table).truncate()));
  } else if (settings.db.dbType === 'mysql') {
    return knex.transaction(async function(trx) {
      await knex.raw('SET FOREIGN_KEY_CHECKS=0').transacting(trx);
      await Promise.all(tables.map(table => knex.raw(`TRUNCATE TABLE ${table}`).transacting(trx)));
      await trx.commit;
      await knex.raw('SET FOREIGN_KEY_CHECKS=1').transacting(trx);
    });
  } else if (settings.db.dbType === 'pg') {
    return Promise.all(tables.map(table => knex.raw(`TRUNCATE "${table}" RESTART IDENTITY CASCADE`)));
  }
};

export const orderedFor = (rows, collection, field, singleObject) => {
  // return the rows ordered for the collection
  const inGroupsOfField = groupBy(rows, field);
  return collection.map(element => {
    const elementArray = inGroupsOfField[element];
    if (elementArray) {
      return singleObject ? elementArray[0] : elementArray;
    }
    return singleObject ? {} : [];
  });
};

const _getSelectFields = (fields, parentPath, domainSchema, selectItems, joinNames, single) => {
  for (const key of Object.keys(fields)) {
    if (key !== '__typename') {
      const value = domainSchema.values[key];
      if (fields[key] === true) {
        if (value && value.transient) {
          continue;
        }
        const as = parentPath.length > 0 ? `${parentPath.join('_')}_${key}` : key;
        const arrayPrefix = single ? '' : '_';
        selectItems.push(`${decamelize(domainSchema.__.name)}.${decamelize(key)} as ${arrayPrefix}${as}`);
      } else {
        if (value.type.constructor === Array) {
          //console.log('Array');
          //console.log(key);
          //console.log(fields[key]);
          //console.log(value.type[0].name);
        } else {
          if (!value.type.__.transient) {
            joinNames.push({ key: decamelize(key), name: decamelize(value.type.__.name) });
          }

          parentPath.push(key);

          _getSelectFields(fields[key], parentPath, value.type, selectItems, joinNames, single);

          parentPath.pop();
        }
      }
    }
  }
};

export const selectBy = (schema, fields, single = false) => {
  // select fields
  const parentPath = [];
  const selectItems = [];
  const joinNames = [];
  _getSelectFields(fields, parentPath, schema, selectItems, joinNames, single);

  return query => {
    // join table names
    joinNames.map(({ key, name }) => {
      query.leftJoin(
        `${schema.__.tablePrefix}${name} as ${name}`,
        `${name}.id`,
        `${decamelize(schema.__.name)}.${key}_id`
      );
    });

    return query.select(selectItems);
  };
};