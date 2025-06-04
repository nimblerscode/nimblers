import journal from './meta/_journal.json';
import m0000 from './0000_special_ulik.sql?raw';
import m0001 from './0001_lying_sleeper.sql?raw';

export default {
  journal,
  migrations: {
    m0000,
    m0001
  }
}
