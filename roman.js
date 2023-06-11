function toRoman( number=1 ) {

  const toSymbol = {
    1: "I",
    5: "V",
    10: "X",
    50: "L",
    100: "C",
    500: "D",
    1000: "M",
    5000: "Y"
  };

  const spread = number => {
    const digits = String(number).split("").reverse();
    let spread = digits.map((digit, index) => digit * (10**index));
  
    return spread.reverse();
  }

  let spreadNumber = spread(number);
  let romanNumeral = "";

  spreadNumber.forEach(digit => {

    // If number is a key in the toSymbol object.
    if (toSymbol[digit]) {
      romanNumeral += `${toSymbol[digit]}`;
    } else if (digit === 0) {} else { // If digit is 0
      let previous;

      for (let symbol in toSymbol) {
        if (digit > symbol) {
          previous = symbol;
        } else {
          let diff = symbol - digit;
          if (toSymbol[diff]) {
            romanNumeral += `${toSymbol[diff]}${toSymbol[symbol]}`
          } else {
            romanNumeral += `${toSymbol[previous]}${toRoman(digit - previous)}`
          }

          break;
        }
      }
    }
  });

  return romanNumeral;
}

let number = 1972;
let start = Date.now();
let stuff = toRoman(number);
let time = Date.now() - start;

console.log(`That took ${time}ms.`)
console.log(`${number} in roman numerals is ${stuff}.`);
