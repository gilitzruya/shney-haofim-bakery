-- Customer code is now mandatory (it links the customer to the accounting system).
-- Together with `name` these are the only two required customer fields; contacts/phone
-- are optional (a phone is needed only to grant app access). The column already has a
-- unique constraint, so this only removes NULL. Fails loudly if any customer has no code.
alter table customers alter column code set not null;
alter table customers add constraint customers_code_not_blank check (btrim(code) <> '');
