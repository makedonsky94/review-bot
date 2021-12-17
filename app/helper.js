export  function mergeArrays(array1, array2) {
    if (!isIterable(array1)) {
        array1 = [];
    }
    if (!isIterable(array2)) {
        array2 = [];
    }

    return [...new Set([...array1, ...array2])];
}

export function isIterable(obj) {
    // checks for null and undefined
    if (!obj == null) {
      return false;
    }
    return typeof obj[Symbol.iterator] === 'function';
}