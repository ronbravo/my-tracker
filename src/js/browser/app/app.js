// ------------------------------------------------
// Core Item System

const NOTHING_ITEM  = '(nothing)';
const SELF_ITEM     = '(self)';

const ITEM_KIND               = 'graceful/core/item';
const LIST_ITEM_KIND          = 'graceful/core/list';
const NUMBER_ITEM_KIND        = 'graceful/core/number';
const TEXT_ITEM_KIND          = 'graceful/core/text';
const ERROR_ITEM_KIND         = 'graceful/core/error';
const ENVIRONMENT_ITEM_KIND   = 'graceful/core/environment';

async function destroyItem (details = {}) {}

async function createItem (details = {}) {
  let { data, kind, value } = details;
  let item;
  
  item = {
    info: {
      mode: 'item ready',
      item: {
        kind: ITEM_KIND,
        composite: [ITEM_KIND],
      },
      total: 0, //1,
      value,
    },
    storage: {
      0: '(nothing)',
      // 1: '(self)',
    },
  }
  
  if (data) {
    await dataToItems ({ data, target: item });
  }
  
  if (kind) {
    item.info.item.kind = kind;
    item.info.item.composite.push (kind);
  }
  
  return item;
}

async function dataToItems (details = {}) {
  let { data, index = 0, tagAsIndex, tags, target } = details;
  let item, kind, tag, value;
  
  // NOTE: As of ES2015 object keys follow a specified
  // iterration order.
  // ref: https://stackoverflow.com/a/38218582
  // TODO: Create an object in JS that mimics behavior for host systems different than JS
  
  if (tags === undefined) {
    tags = Object.keys (data);
    details.tags = tags;
  }
  
  tag = tags [index];
  if (tag) {
    details.index = index + 1;
    
    if (index < tags.length) {
      value = data [tag];

      if (value) {
        kind = value.constructor.name;
        if (kind === 'String') {
          item = await createItem ({ kind: TEXT_ITEM_KIND, value });          
          await addItemLink ({
            tagAsIndex,
            target,
            to: {
              [tag]: item,
            },
          });
        }
        else if (kind === 'Number') {
          item = await createItem ({ kind: NUMBER_ITEM_KIND, value });
          await addItemLink ({
            tagAsIndex,
            target,
            to: { 
              [tag]: item,
            },
          });
        }
        else if (kind === 'Object') {
        }
        else if (kind === 'Array') {
          item = await createItem ({ kind: LIST_ITEM_KIND });
          await dataToItems ({ data: value, target: item, tagAsIndex: true });
          
          await addItemLink ({
            tagAsIndex,
            target,
            to: { 
              [tag]: item,
            },
          });
        }
      }
      else {
      }
      
      await dataToItems (details);
    }
  }
}

async function generateId (detail = {}) {
  let gid;
  gid = [
    'gid', Date.now (), ('' + randomNumber (0, 9999)).padStart (4, '0')
  ].join ('-');
  return gid;
}

function randomNumber (min, max) {
  // min and max included
  // https://stackoverflow.com/a/7228322
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// ------------------------------------------------
// Environment

let root;

async function createEnvironment (details = {}) {
  let { data = {} } = details;
  let item;
  item = await createItem ({
    data: Object.assign ({
      name: 'no name environment',
      children: ['ron'],
    }, data),
    kind: ENVIRONMENT_ITEM_KIND,
  });
  return item;
}

async function getEnvironment (details = {}) {
  let { name = 'main' } = details;
  let area;
  
  if (!root) {
    root = await createEnvironment ({ data: { name: 'root environment' } });
    console.log ('ROOT:', JSON.stringify (root, null, 2));
  }
  
  area = await getPathData ({
    path: 'children/' + name,
    target: root,
  });

//  console.warn ('TODO: get area by name');
//  area = shared.area [name];
//  if (!area) {
//    area = await createEnvironment ({ name }),
//    shared.area [name] = area;
//  }
  return area;
}

// ------------------------------------------------
// Link Items

async function addItemLink (details = {}) {
  let { from, tagAsIndex, target, to } = details;
  let area, id, item, list, tag, total;

  if (target) {
    total = target.info.total;
    
    if (from) { 
      list = from; 
      area = 'from';
    }
    else if (to) { 
      list = to;
      area = 'to';
    }
    
    for (tag in list) {
      total = total + 1;
      id = total;
      
      // add item to storage
      await setExplicitPathListData ({
        target,
        path: [
          `storage/${id}:`, list [tag],
        ],
      });
      
      // create link to storage
      if (tagAsIndex) {
        tag = '' + total;
      }
      
      await setExplicitPathListData ({
        target,
        path: [
          `link/${area}/${tag}/id:`, id,
        ],
      });
      
      target.info.total = total;
    }
  }
}

async function removeItemLink (details = {}) {}

// -------------------------------------------------------
// Data Path

//setPathData
//
//setExplicitPathData
//await setDataExplict ({ path });

async function getPathData (details = {}) {}

async function getPathListData (details = {}) {}

async function getExplicitPathData (details = {}) {}

async function getExplicitPathListData (details = {}) {}

async function setPathData (details = {}) {}

async function setPathListData (details = {}) {}

async function setExplicitPathData (details = {}) {
  let { path, index = 0, target, total, value = null } = details;
  let item, tag;
  
  if (path) {  
    if (path.constructor.name === 'String') { path = path.split ('/'); }
    if (total === undefined) {
      total = path.length;
      details.total = total;
    }
    
    tag = path [index];
    if (tag) {
      details.index = index + 1;

      if (index === (total - 1)) {
        item = target [tag];
        if (!item || (item && item.constructor.name !== 'Object')) {
          target [tag] = value;
        }
      }
      else if (index < total) {
        item = target [tag];
        if (item === undefined) {
          item = {};
          target [tag] = item;          
        }

        // console.log ('TAG:', tag, value);
        details.target = item;        
        await setExplicitPathData (details);
      }
    }
  }
}

async function setExplicitPathListData (details = {}) {
  let { path, index = 0, target } = details;
  let route, value;
  
  route = path [index];
  if (route) {
    details.index = index + 1;
    
    route = route.trim ();
    if (route [(route.length - 1)] === ':') {
      value = path [index + 1];
      details.index = index + 1;
    }
    
    route = route.substring (0, (route.length - 1));
    route = route.split ('/');

    await setExplicitPathData ({
      path: route,
      target,
      value,
    });

    // console.log ('ROUTE:', value, route);
  }
}

// ------------------------------------------------
// App

export async function startApp (details = {}) {
  console.log ('- started app', window);
  
  await import ('/my-tracker-domo/start.js');
  
  await action ({
    name: 'my-tracker/create',
    // NOTE: In graceful we would convert data to a graceful item and list structure
    data: {
      name: 'My Tracker',
      description: 'My personal and simple task and time tracker app.',
      entry: {
        end: 0,
        start: 0,
        mode: 'ready',
      },
      history: [],
    },
  });
}

// ------------------------------------------------
// My Tracker App

onAction ({
  name: 'my-tracker/create',
  response: async function createMyTrackerApp (details = {}) {
    console.log ('create the my tracker app...');
  },
});












// ------------------------------------------------
// Core system

// Data to store
//async function getData (details = {}) {}
//async function setData (details = {}) {}

async function beforeData (details = {}) {}
async function afterData (details = {}) {}

async function onData (details = {}) {
  let main;
  main = await getEnvironment ();
}

globalThis.onData = onData;

// Action
async function onAction (details = {}) {
  let { name, response } = details;
  let area, list;
  
  if (!name) { throw new Error ('action handler needs a name.'); }
  if (!response) { throw new Error ('action handler needs a response handler.'); }
  
  area = await getEnvironment ();
//  list = name.split ('/');
//  console.log (list);
}

async function beforeAction () {}
async function afterAction () {}

async function action (details = {}) {
  let { data = {}, name } = details;
  let area, ensure, list, result;
  
  if (!name) { throw new Error ('must provide a name for target action.'); }
  
  area = await getEnvironment ();
  return console.log (JSON.stringify (area, null, 2));
  
  list = name.split ('/');
  console.log (list);
  
  ensure = [];
  await nextPathSection ({
    ensure,
    list,
    current: area.action,
  });
  
  if (ensure.length) {
    console.log ('created action path for name: (' + name + ')');
    console.log (JSON.stringify (area.action, null, 2));
  }
}

globalThis.action = action;
globalThis.afterAction = afterAction;




// ------------------------------------------------
// BRAINSTORM

//  await action ({
//    name: 'set-data',
//    data: { target: 'bravo/apps/my-tracker', end: Date.now (), start: Date.now () },
//  });
//  
//  await action ({
//    name: 'my-tracker/start-tracking-time',
//    data: { target: 'bravo/apps/my-tracker', end: Date.now (), start: Date.now () },
//  });

//onData ({ path: 'bravo/apps/my-tracker', handler: async function createMyTrackerVisuals (details = {}) {
//  console.log ('- Add a ui to my-tracker');
//}});
//
//onAction ({ path: 'my-tracker/start-tracking-time', handler: async function startTrackingTime (details = {}) {
//  console.log ('- start tracking time');
//}});

// ------------------------------------------------
// OLD CODE

//async function nextPathSection (details = {}) {
//  let { current, ensure, index = 0, list } = details;
//  let item, tag;
//
//  tag = list [index];
//  item = current [tag];
// 
//  if (!item && ensure && index < (list.length - 1)) {
//    item = await createItem ();
//    
//    current [tag] = item;
//    ensure.push (tag);
//    console.log ('creating:', index, tag);
//  }
//  
//  if (item) {
//    details.index = index + 1;
//    details.current = item;
//    await nextPathSection (details);
//  }
//}

//async function createEnvironment (details = {}) {
//  let { name = 'no name' } = details;
//  let area;
//  
//  area = createItem ({ 
//    data: { name },
//  });
//  
////  area = {
////    name,
////    action: {},
////    storage: {
////      0: '(nothing)',
////      1: '(self)',
////      2: {},
////    },
////  }
//  
//  return area;
//}

  //  setData ({ path: 'app/my-tracker', data: {
//    name: 'My Tracker',
//    description: 'My personal time and task tracker app',
//  }});
  
  
//  let item;
//  
//  item = {
//    name: 'bob',
//    age: 32,
//    city: 'phoenix',
//  }
//  
//  setData ('app/my-tracker', item)

//  send ({ path: 'app/my-tracker', item });
//  addItem ('app/my-tracker', item);
  // setData ('app/my-tracker', item);
  
//  setPath ();
//  await import ('./my-tracker/start.js');  
//  emit ({ path: 'my-tracker/create' });
//}

//import '/script/library/route-recognizer/start.js';
//
//const {
//  // axios, dayjs, Navigo, objectPath, routie, less,
//  RouteRecognizer,
//} = window;
//
//async function getRouter (details = {}) {
//  let router;
//  router = shared.router;
//  if (!router) {
//    router = new RouteRecognizer ();
//    shared.router = router;
//  }
//  return router;
//}
//  
//async function emit (details = {}) {
//  let { path } = details;
//  let result, router;
//
//  router = await getRouter ();
//  result = router.recognize (path);
//  
//  if (result && result.length) {
//    await runNextHandler ({
//      path,
//      list: result,
//      index: 0,
//    });
//  }
//  else {
//    console.error ('route was not found:', path);
//  }
//}
//
//async function listen (details = {}) {
//  let { handler, path } = details;
//  let router;
//  
//  if (handler) {
//    router = await getRouter ();
//    router.add ([
//      {
//        path,
//        handler,
//      },
//    ]);
//  }
//  else {
//    console.error ('a handler must be provided to accept messages on path: [' + path + ']');
//  }
//}
//
//globalThis.emit     = emit;
//globalThis.listen   = listen;
//
//async function runNextHandler (details = {}) {
//  let { index = 0, list, path } = details;
//  let item;
//  
//  item = list [index];
//  if (item) {
//    details.index = index + 1;
//    
//    if (item.handler) {
//      console.log (item);
//      await item.handler ();
//    }
//    else {
//      console.error ('handler not provided for path: [' + path + ']');
//    }
//    
//    await runNextHandler (details);
//  }
//}



//async function createLink (details) {
//  let { link, target } = details;
//  let id, item, tag, total;
//  
//  if (target) {
//    total = target.info.total;
//    total = total + 1;
//    id = total;
//   
//    for (tag in link.to.tagged) {
//      await setRealItemPathData ({
//        target,
//        path: [
//          `link/to/tagged/${tag}/${id}:`, id,
//        ],
//      });
//    }
//  }  
//}

//        await createLink ({
//          target,
//          link: {
//            to: {
//              tagged: {
//                item,
//              },
//            },
//          },
//        });
        // console.log ('ITEM:', tag, value, JSON.stringify (item, null, 2));

// if (!target.link) { target.link = {} }
    // if (!target.link.from) { target.link.from = {} }
    
//    if (!target.link) { target.link = {} }
//    if (!target.link.to) { target.link.to = {} }
//    // if (!target.link.to.ordered) { target.link.to.ordered = {} }
//    if (!target.link.to.tagged) { target.link.to.tagged = {} }
    
    
  
//      item = link.to.tagged [tag];
//      target.link.to.tagged [tag] = { id },
//      target.storage [id] = item;
//    }
//  }
  
  //    link: {
  //      from: {
  //        ordered: {},
  //        tagged: {},
  //      },
  //      to: {
  //        ordered: {},
  //        tagged: {},
  //      },
  //    },

//shared.enviornment = await createItem ();
//  environment: {},
//  
//  // OLD...
//  area: {},
//  actions: {},
//  storage: {},
//}

//const shared = {
//  environment: {},
//  
//  // OLD...
//  area: {},
//  actions: {},
//  storage: {},
//}

