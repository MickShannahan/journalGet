const sur = ['Mr. ', 'Lady ', 'Sir ', 'Big ', 'Professor ', 'Capitan ', 'Mayor ', 'Mc ', 'Master ', 'Prime Meowster ', 'Gran-', 'Madam ', 'Her Royal Highness ', 'Duchess ', 'Baroness ', 'Countess ', 'Mistress ', 'Vice Chancellor ', 'Elder ', 'The Venerable ', '']
const start = ['Fizz', 'Wiggle', 'Fuzz', 'Mouse', 'Frisk', 'Scruf', 'Hairy', 'Klaus', 'Mocha', 'Mert', 'Poppy', 'Butter', 'Caramel', '', 'Potato', 'Nip', 'Bean', 'Vanilla', 'Snibbly', 'Filtch', 'Norris', 'Grumpy', 'Whisker', 'Simba', 'Teddy', 'Abraham', 'Taco', 'Bert', 'Bern', 'Tiger']
const end = ['s', 'bum', '-buttons', 'ington', ' esquire', 'mellow', 'wumps', 'worth', ' Blackwell', ' O,neal', ' .jr', 'butt', 'smith', 'bottom', 'paws', 'loaf', 'ordinal', 'buzz', '-shakur']
const cats = ['/ᐠ｡ꞈ｡ᐟ\\ﾉ', '/ᐠ.ꞈ.ᐟ\\ﾉ', '/ᐠ_ ꞈ _ᐟ\\ﾉ', '/ᐠ .⋏. ᐟ\\ﾉ', '/ᐠﹷ ‸ ﹷ ᐟ\\ﾉ', '/ᐠ . ֑ . ᐟ\\ﾉ',
  '/ᐠܻܻ   ့⑅ܻᐟ\\', '/ᐠ𝅒_𝅒ᐟ\\ﾉ', '/ᐠ ̷  ̷𝅒 ̷‸ ̷𝅒 ̷ ᐟ\\ﾉ', '/ᐠ-ᆽ-ᐟ \\ﾉ', '/ᐠ ̥  ̮  ̥ ᐟ\\ฅ', '/ᐠ ̥    ̣̮ ̥ ᐟ\\ﾉ', '/ᐠ ̞  ‸  ̞ᐟ\\ﾉ', '(ﾐዋ ﻌ ዋﾐ)ﾉ', '(๑ↀᆺↀ๑)', '(ﾐΦ ﻌ Φﾐ)ﾉ', '(ﾐዕᆽዕﾐ)', '(˵Φ ω Φ˵)', '(ﾐዎ ﻌ ዎﾐ)ﾉ', '(^≗ω≗^)',
  '(^・x・^)', '(=｀ェ´=)', '/ᐠ=ᆽ≠ ᐟ \\∫', '(=🝦 ﻌ 🝦=)', '(=🝦 ﻌ 🝦=)', '₍⸍⸌̣ʷ̣̫⸍̣⸌₎', '=＾ᵒ⋏ᵒ＾=', '(=〃ﻌ〃=)', '=＾ㅎ ⋏ ㅎ＾=', '=＾● ⋏ ●＾=', '=＾• ⋏ •＾=', '＾⌤＾', '̳ ៱˳_˳៱ ̳ ∫']

module.exports = class Cat {
  static getName() {
    const num = Math.ceil(Math.random() * 3)
    let part1 = ''
    if (num > 1) part1 = sur[Math.floor(Math.random() * sur.length)]
    const part2 = start[Math.floor(Math.random() * start.length)]
    let part3 = end[Math.floor(Math.random() * end.length)]
    part3 = part3 === 'ordinal' ? ordinal() : part3
    return part1 + part2 + part3
  }

  static getCat() {
    return cats[Math.floor(Math.random() * cats.length)]
  }
}
function ordinal() {
// eslint-disable-next-line prefer-const
  let num = Math.ceil(Math.random() * 2)
  if (num === 1) {
  // eslint-disable-next-line prefer-const
    let n = Math.floor(Math.random() * 50)
    let res = ''
    if (n === 0) res = String(n)
    switch (n % 10) {
      case 1:
        if (n === 11) {
          res = `${n}th`
          break
        }
        res = `${n}st`
        break
      case 2:
        if (n === 12) {
          res = `${n}th`
          break
        }
        res = `${n}nd`
        break
      case 3:
        if (n === 13) {
          res = `${n}th`
          break
        }
        res = `${n}rd`
        break
      default:
        res = `${n}th`
        break
    }
    return ' the ' + res
  }
  return ''
}
