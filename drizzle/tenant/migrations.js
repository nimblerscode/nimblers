import journal from './meta/_journal.json';
import m0000 from './0000_marvelous_terror.sql?raw';
import m0001 from './0001_skinny_solo.sql?raw';
import m0002 from './0002_neat_arclight.sql?raw';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002
  }
}
