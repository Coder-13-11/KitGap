-- Live Google Forms sync was removed from the app. Imported pledges already
-- saved in pledges/import_batches stay, so old drives still add up.
drop table if exists form_webhook_hits;
drop table if exists form_webhooks;
