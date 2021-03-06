var env, store, Person, Address, Hobby, people;
var all = Ember.RSVP.all;

QUnit.module("unit - `MF.fragmentArray` property", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string'),
      addresses: MF.fragmentArray('address'),
      hobbies: MF.fragmentArray('hobby', { defaultValue: null })
    });

    Address = MF.Fragment.extend({
      street: DS.attr('string'),
      city: DS.attr('string'),
      region: DS.attr('string'),
      country: DS.attr('string')
    });

    Hobby = MF.Fragment.extend({
      name: DS.attr('string')
    });

    env = setupEnv({
      person: Person,
      address: Address,
      hobby: Hobby
    });

    store = env.store;

    expectNoDeprecation();

    people = [
      {
        id: 1,
        name: "Tyrion Lannister",
        addresses: [
          {
            street: "1 Sky Cell",
            city: "Eyre",
            region: "Vale of Arryn",
            country: "Westeros"
          },
          {
            street: "1 Tower of the Hand",
            city: "King's Landing",
            region: "Crownlands",
            country: "Westeros"
          }
        ]
      },
      {
        id: 2,
        name: "Eddard Stark",
        addresses: [
          {
            street: "1 Great Keep",
            city: "Winterfell",
            region: "North",
            country: "Westeros"
          }
        ]
      },
      {
        id: 3,
        name: "Jojen Reed",
        addresses: null
      }
    ];
  },

  teardown: function() {
    env = null;
    store = null;
    Person = null;
    Address = null;
    Hobby = null;
    people = null;
  }
});

function pushPerson(id) {
  store.push({
    data: {
      type: 'person',
      id: id,
      attributes: Ember.A(people).findBy('id', id)
    }
  });
}

test("properties are instances of `MF.FragmentArray`", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    ok(Ember.isArray(addresses), "property is array-like");
    ok(addresses instanceof MF.FragmentArray, "property is an instance of `MF.FragmentArray`");
  });
});

test("arrays of object literals are converted into instances of `MF.Fragment`", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    ok(addresses.every(function(address) {
      return address instanceof Address;
    }), "each fragment is a `MF.Fragment` instance");
  });
});

test("fragments created through the store can be added to the fragment array", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');
    var length = addresses.get('length');

    var address = store.createFragment('address', {
      street: "1 Dungeon Cell",
      city: "King's Landing",
      region: "Crownlands",
      country: "Westeros"
    });

    addresses.addFragment(address);

    equal(addresses.get('length'), length + 1, "address property size is correct");
    equal(addresses.indexOf(address), length, "new fragment is in correct location");
  });
});

test("adding a non-fragment model or object literal throws an error", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    throws(function() {
      var otherPerson = store.createRecord('person');

      addresses.addFragment(otherPerson);
    }, "error is thrown when adding a DS.Model instance");
  });
});

test("adding fragments from other records throws an error", function() {
  pushPerson(1);
  pushPerson(2);

  return all([
    store.find('person', 1),
    store.find('person', 2)
  ]).then(function(people) {
    var address = people[0].get('addresses.firstObject');

    throws(function() {
      people[1].get('addresses').addFragment(address);
    }, "error is thrown when adding a fragment from another record");
  });
});

test("setting to an array of fragments is allowed", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    var addresses = person.get('addresses');

    var address = store.createFragment('address', {
      street: "1 Dungeon Cell",
      city: "King's Landing",
      region: "Crownlands",
      country: "Westeros"
    });

    person.set('addresses', [ address ]);

    equal(person.get('addresses'), addresses, "fragment array is the same object");
    equal(person.get('addresses.length'), 1, "fragment array has the correct length");
    equal(person.get('addresses.firstObject'), address, "fragment array contains the new fragment");
  });
});

test("defaults to an empty array", function() {
  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {}
    }
  });

  store.push({
    data: {
      type: 'person',
      id: 2,
      attributes: {}
    }
  });

  return store.find('person', 1).then(function(person) {
    ok(Ember.isArray(person.get('addresses')), "defaults to an array");
    ok(Ember.isEmpty(person.get('addresses')), "default array is empty");

    store.find('person', 2).then(function(person2) {
      ok(person.get('addresses') !== person2.get('addresses'), "default array is unique");
    });
  });
});

test("default value can be null", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    equal(person.get('hobbies'), null, "defaults to null");

    var hobbies = [
      store.createFragment('hobby', {
        name: 'guitar'
      })
    ];

    person.set('hobbies', hobbies);
    equal(person.get('hobbies.length'), 1, "can be set to an array");
  });
});

test("null values are allowed", function() {
  pushPerson(3);

  return store.find('person', 3).then(function(person) {
    equal(person.get('addresses'), null, "property is null");
  });
});

test("setting to null is allowed", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    person.set('addresses', null);

    equal(person.get('addresses'), null, "property is null");
  });
});

test("fragments are created from an array of object literals when creating a record", function() {
  Ember.run(function() {
    var address = {
      street: '1 Sea Tower',
      city: 'Pyke',
      region: 'Iron Islands',
      country: 'Westeros'
    };

    var person = store.createRecord('person', {
      name: {
        first: 'Balon',
        last: 'Greyjoy'
      },
      addresses: [ address ]
    });

    ok(person.get('addresses.firstObject') instanceof MF.Fragment, "a `MF.Fragment` instance is created");
    equal(person.get('addresses.firstObject.street'), address.street, "fragment has correct values");
  });
});

test("setting a fragment array to an array of to an object literals creates new fragments", function() {
  var address = {
    street: '1 Great Keep',
    city: 'Pyke',
    region: 'Iron Islands',
    country: 'Westeros'
  };

  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: 'Asha',
          last: 'Greyjoy'
        },
        addresses: null
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    person.set('addresses', [ address ]);

    ok(person.get('addresses.firstObject') instanceof MF.Fragment, "a `MF.Fragment` instance is created");
    equal(person.get('addresses.firstObject.street'), address.street, "fragment has correct values");
  });
});

test("setting a fragment array to an array of object literals reuses an existing fragments", function() {
  var newAddress = {
    street: '1 Great Keep',
    city: 'Winterfell',
    region: 'North',
    country: 'Westeros'
  };

  store.push({
    data: {
      type: 'person',
      id: 1,
      attributes: {
        name: {
          first: 'Theon',
          last: 'Greyjoy'
        },
        addresses: [
          {
            street: '1 Great Keep',
            city: 'Pyke',
            region: 'Iron Islands',
            country: 'Westeros'
          }
        ]
      }
    }
  });

  return store.find('person', 1).then(function(person) {
    var address = person.get('addresses.firstObject');

    person.set('addresses', [ newAddress ]);

    equal(address, person.get('addresses.firstObject'), "fragment instances are reused");
    equal(person.get('addresses.firstObject.street'), newAddress.street, "fragment has correct values");
  });
});


test("setting to an array of non-fragments throws an error", function() {
  pushPerson(1);

  return store.find('person', 1).then(function(person) {
    throws(function() {
      person.set('addresses', [ 'address' ]);
    }, "error is thrown when setting to an array of non-fragments");
  });
});

test("fragments can have default values", function() {
  Ember.run(function() {
    var defaultValue = [
      {
        street: "1 Throne Room",
        city: "King's Landing",
        region: "Crownlands",
        country: "Westeros"
      }
    ];

    var Throne = DS.Model.extend({
      name: DS.attr('string'),
      addresses: MF.fragmentArray('address', { defaultValue: defaultValue })
    });

    env.registry.register('model:throne', Throne);

    var throne = store.createRecord('throne', { name: 'Iron' });

    equal(throne.get('addresses.firstObject.street'), defaultValue[0].street, "the default value is used when the value has not been specified");

    throne.set('addresses', null);
    equal(throne.get('addresses'), null, "the default value is not used when the value is set to null");

    throne = store.createRecord('throne', { name: 'Iron', addresses: null });
    equal(throne.get('addresses'), null, "the default value is not used when the value is initialized to null");
  });
});

test("fragment default values can be functions", function() {
  Ember.run(function() {
    var defaultValue = [
      {
        street: "1 Great Keep",
        city: "Winterfell",
        region: "North",
        country: "Westeros"
      }
    ];

    var Sword = DS.Model.extend({
      name: DS.attr('string'),
      addresses: MF.fragmentArray('address', { defaultValue: function() { return defaultValue; } })
    });

    env.registry.register('model:sword', Sword);

    var sword = store.createRecord('sword', { name: 'Ice' });

    equal(sword.get('addresses.firstObject.street'), defaultValue[0].street, "the default value is correct");
  });
});
