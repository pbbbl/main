const { functions, secrets, db } = require("./useKit");
const { pubsub, pub, sub } = require("./pubsubStore");

const DbTriggers = (cid = "games", dbPath = "games/{docId}", callbacks) => {
  //   const onWrite = (change, context, action) => {
  //     console.log("onWrite", change, context, action);
  //     if (typeof callbacks.onWrite == "function") {
  //       return callbacks.onWrite(change, context, action);
  //     } else {
  //     }
  //   };
  const onCreate = (snap, context) => {
    const game = snap.data();
    console.log("onCreate", change, context);
    // onWrite(change, context, "onCreate");
    if (typeof callbacks.onCreate == "function") {
      return callbacks.onCreate(snap, context);
    }
  };
  const onChange = (change, context) => {
    console.log("onChange", change, context);
    //   onWrite(change, context, "onChange");
    if (typeof callbacks.onChange == "onChange") {
      return callbacks.onChange(change, context);
    }
  };
  const onDelete = (snap, context) => {
    console.log("onDelete", snap, context);
    //   onWrite(change, context, "onDelete");
    if (typeof callbacks.onDelete == "onDelete") {
      return callbacks.onDelete(snap, context);
    }
  };
  const onCreateListener = functions.firestore
    .document(dbPath)
    .onCreate(onCreate);
  const onChangeListener = functions.firestore
    .document(dbPath)
    .onUpdate(onChange);
  const onDeleteListener = functions.firestore
    .document(dbPath)
    .onDelete(onDelete);
  return {
    [`onCreateListener_${cid}`]: onCreateListener,
    [`onChangeListener_${cid}`]: onChangeListener,
    [`onDeleteListener_${cid}`]: onDeleteListener,
  };
};

// const gamesListeners = DbTriggers("games", "games/{docId}", {
//   onCreate: (change, context) => {
//     console.log("created", change, context);
//     return change.data();
//   },
//   onChange: (change, context) => {
//     console.log("changed", change, context);
//     return change.after.data();
//   },
//   onDelete: (change, context) => {
//     console.log("deleted", change, context);
//     return change.data();
//   },
// });

/**
 * 
  console.log({ ctx });
  const { actionId, change, firebaseContext } = ctx;
  console.log(actionId, change, firebaseContext);
  return {
    topics: [],
  };
});
 */

module.exports = {
  modules: {},
  DbTriggers,
};
