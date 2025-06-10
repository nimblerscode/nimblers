import journal from './meta/_journal.json';
import m0000 from './0000_special_ulik.sql?raw';
import m0001 from './0001_lying_sleeper.sql?raw';
import m0002 from './0002_add_unique_external_message_id.sql?raw';

export default {
  journal,
  migrations: {
    m0000,
    m0001,
    m0002
  }
}
